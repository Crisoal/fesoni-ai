// src/components/DocumentPreview.tsx
import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Share2,
  Smartphone,
  Image as ImageIcon,
  X,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DocumentPreviewProps {
  documents: {
    mainDocument?: string; // base64 string
    documentId?: string;
    processedVersions?: Array<{
      type: string;
      taskId: string;
      status?: 'processing' | 'completed' | 'failed';
      downloadUrl?: string;
      size?: number;
    }>;
  };
  onDownloadDocument?: (documentId: string, filename?: string) => Promise<Blob>;
  onCheckTaskStatus?: (taskId: string) => Promise<{
    status: 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
  }>;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  documents,
  onDownloadDocument,
  onCheckTaskStatus
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadingTasks, setDownloadingTasks] = useState<Set<string>>(new Set());

  const handlePreview = (content: string | Blob) => {
    let url: string;

    if (typeof content === 'string') {
      // Handle base64 content
      const byteCharacters = atob(content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      url = URL.createObjectURL(blob);
    } else {
      // Handle blob content
      url = URL.createObjectURL(content);
    }

    setPreviewUrl(url);
    setShowPreview(true);
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setShowPreview(false);
    setPreviewUrl(null);
  };

  const handleDownloadMainDocument = async () => {
    if (documents.mainDocument) {
      // Convert base64 to blob and download
      const byteCharacters = atob(documents.mainDocument);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'style-guide.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Update the handleDownloadProcessedDocument function in DocumentPreview.tsx
  const handleDownloadProcessedDocument = async (taskId: string, type: string, documentIdOrUrl?: string) => {
    if (!onDownloadDocument) return;

    setDownloadingTasks(prev => new Set(prev).add(taskId));

    try {
      let blob: Blob;

      if (documentIdOrUrl) {
        // Use the provided document ID or URL
        console.log(`Downloading using provided ID/URL: ${documentIdOrUrl}`);
        blob = await onDownloadDocument(documentIdOrUrl, `${type}.pdf`);
      } else if (documents.documentId) {
        // Fallback to main document ID
        console.log(`Downloading using main document ID: ${documents.documentId}`);
        blob = await onDownloadDocument(documents.documentId, `${type}.pdf`);
      } else {
        throw new Error('No download method available');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Show user-friendly error
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('image') || type.includes('social')) return <ImageIcon className="w-5 h-5" />;
    if (type.includes('compressed')) return <Smartphone className="w-5 h-5" />;
    if (type.includes('reference') || type.includes('quick')) return <Eye className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  const formatDocumentType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'compressed': 'Compressed PDF',
      'social-images': 'Social Media Images',
      'quick-reference': 'Quick Reference Pages',
      'split': 'Split Sections',
      'extracted-text': 'Text Content',
      'extracted-images': 'Extracted Images'
    };

    return typeMap[type] || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDocumentDescription = (type: string): string => {
    const descriptionMap: { [key: string]: string } = {
      'compressed': 'Smaller file size for sharing',
      'social-images': 'Perfect for social media posts',
      'quick-reference': 'Essential pages for quick access',
      'split': 'Document broken into sections',
      'extracted-text': 'Text content only',
      'extracted-images': 'All images from the document'
    };

    return descriptionMap[type] || 'Additional format option';
  };

  if (!documents || (!documents.mainDocument && !documents.processedVersions?.length)) {
    return null;
  }

  return (
    <>
      <div className="mt-6 p-6 bg-gradient-to-r from-gray-900/50 to-purple-900/30 rounded-xl border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-semibold text-white">Your Personalized Style Documents</h4>
            <p className="text-gray-400 text-sm">AI-generated style guides tailored just for you</p>
          </div>
        </div>

        {/* Main Document */}
        {documents.mainDocument && (
          <div className="mb-6">
            <div className="group bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">Complete Style Guide</h5>
                    <p className="text-gray-400 text-sm">Your comprehensive style portfolio</p>
                  </div>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Ready</span>
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handlePreview(documents.mainDocument!)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={handleDownloadMainDocument}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processed Documents */}
        {documents.processedVersions && documents.processedVersions.length > 0 && (
          <div>
            <h6 className="text-white font-medium mb-4 flex items-center space-x-2">
              <Share2 className="w-4 h-4 text-gray-400" />
              <span>Additional Formats & Processing Options</span>
            </h6>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.processedVersions.map((doc, index) => (
                <div
                  key={index}
                  className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/20 hover:border-gray-500/40 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {formatDocumentType(doc.type)}
                      </div>
                      <p className="text-gray-400 text-xs truncate">
                        {getDocumentDescription(doc.type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(doc.status)}
                      <span className="text-xs text-gray-400">
                        {getStatusText(doc.status)}
                      </span>
                      {doc.size && (
                        <span className="text-xs text-gray-500">
                          {Math.round(doc.size / 1024)}KB
                        </span>
                      )}
                    </div>

                    {/* Update the button call to pass the downloadUrl (which is now just a document ID) */}
                    {doc.status === 'completed' ? (
                      <button
                        onClick={() => handleDownloadProcessedDocument(doc.taskId, doc.type, doc.downloadUrl)}
                        disabled={downloadingTasks.has(doc.taskId)}
                        className="text-purple-400 hover:text-purple-300 disabled:text-gray-500 text-xs font-medium flex items-center space-x-1 transition-colors"
                      >
                        {downloadingTasks.has(doc.taskId) ? (
                          <Clock className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        <span>{downloadingTasks.has(doc.taskId) ? 'Getting...' : 'Get'}</span>
                      </button>
                    ) : doc.status === 'processing' ? (
                      <span className="text-xs text-yellow-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Processing...</span>
                      </span>
                    ) : doc.status === 'failed' ? (
                      <span className="text-xs text-red-400 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onCheckTaskStatus && onCheckTaskStatus(doc.taskId)}
                        className="text-gray-400 hover:text-gray-300 text-xs font-medium flex items-center space-x-1 transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Check Status</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border-l-4 border-purple-500">
          <h6 className="text-white font-medium mb-2">Tips for Your Style Documents</h6>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Use compressed versions for easy sharing</li>
            <li>• Convert to images for social media posts</li>
            <li>• Extract key pages for quick outfit references</li>
            <li>• Keep the complete guide for comprehensive styling</li>
          </ul>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-4xl max-h-[90vh] w-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Document Preview</h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-gray-600"
                title="Document Preview"
              />
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end space-x-3">
              <button
                onClick={closePreview}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <a
                href={previewUrl}
                download="style-guide.pdf"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentPreview;