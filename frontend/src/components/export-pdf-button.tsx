import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import { FileDown, Loader2 } from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const EXPORT_PDF_QUERY = gql`
  query ExportTimeClockPdf($userId: ID, $startDate: Date, $endDate: Date) {
    exportTimeClockPdf(userId: $userId, startDate: $startDate, endDate: $endDate) {
      downloadUrl
      filename
    }
  }
`;

interface ExportResult {
    downloadUrl: string;
    filename: string;
}

interface ExportPdfQueryResult {
    exportTimeClockPdf: ExportResult;
}

interface ExportPdfButtonProps extends React.ComponentProps<typeof Button> {
    userId?: string;
    startDate?: string;
    endDate?: string;
    label?: string;
    showIcon?: boolean;
}

export function ExportPdfButton({
    userId,
    startDate,
    endDate,
    label = "Export PDF",
    showIcon = true,
    className,
    variant = "outline",
    size = "sm",
    ...props
}: ExportPdfButtonProps) {
    const [triggerExport, { loading }] = useLazyQuery<ExportPdfQueryResult>(EXPORT_PDF_QUERY, {
        fetchPolicy: "network-only",
    });

    const handleExport = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        triggerExport({
            variables: {
                userId,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            },
        })
            .then((result) => {
                if (result.data?.exportTimeClockPdf) {
                    const { downloadUrl, filename } = result.data.exportTimeClockPdf;
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("PDF export started");
                }
            })
            .catch((err) => {
                console.error("Export failed", err);
                toast.error(`Failed to export PDF: ${err.message || "Unknown error"}`);
            });
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleExport}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : showIcon ? (
                <FileDown className="h-4 w-4 mr-2" />
            ) : null}
            {loading ? "Exporting..." : label}
        </Button>
    );
}
