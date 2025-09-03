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
  ExternalLink
} from 'lucide-react';

interface DocumentPreviewProps {
  documents: {
    mainDocument?: {
      documentId: string;
      downloadUrl: string;
      status: string;
    };
    processedDocuments?: Array<{
      type: string;
      downloadUrl: string;
      size?: number;
    }>;
    quickReference?: {
      documentId: string;
      downloadUrl: string;
      status: string;
    };
  };
}

// Define types for the mapping objects
type TypeMap = {
  [key: string]: string;
};

type DescriptionMap = {
  [key: string]: string;
};

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documents }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewUrl(null);
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('image') || type.includes('social')) return <ImageIcon className="w-5 h-5" />;
    if (type.includes('mobile') || type.includes('compressed')) return <Smartphone className="w-5 h-5" />;
    if (type.includes('reference') || type.includes('quick')) return <Eye className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatDocumentType = (type: string): string => {
    const typeMap: TypeMap = {
      'mobile-optimized': 'Mobile Optimized',
      'compressed': 'Compressed PDF',
      'quick-reference-pages': 'Key Pages',
      'social-image-1': 'Cover Image',
      'social-image-2': 'Style Summary',
      'social-image-3': 'Product Showcase',
      'section-1': 'Style Profile',
      'section-2': 'Product Guide',
      'section-3': 'Styling Tips',
      'merged-comprehensive-guide': 'Complete Package'
    };

    return typeMap[type] || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDocumentDescription = (type: string): string => {
    const descriptionMap: DescriptionMap = {
      'mobile-optimized': 'Perfect for viewing on your phone',
      'compressed': 'Smaller file size for sharing',
      'quick-reference-pages': 'Essential pages for quick access',
      'social-image-1': 'Share your style cover',
      'social-image-2': 'Post your style summary',
      'social-image-3': 'Showcase your curated products',
      'section-1': 'Your personal style analysis',
      'section-2': 'Curated product recommendations',
      'section-3': 'Expert styling advice'
    };

    return descriptionMap[type] || 'Additional format option';
  };

  if (!documents || (!documents.mainDocument && !documents.quickReference && !documents.processedDocuments?.length)) {
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
            <p className="text-gray-400 text-sm">Curated style guides tailored just for you</p>
          </div>
        </div>

        {/* Main Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Complete Style Guide */}
          {documents.mainDocument && (
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
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  {documents.mainDocument.status}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePreview(documents.mainDocument!.downloadUrl)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <a
                  href={documents.mainDocument.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}

          {/* Quick Reference */}
          {documents.quickReference && (
            <div className="group bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">Quick Reference</h5>
                    <p className="text-gray-400 text-sm">Essential picks for easy shopping</p>
                  </div>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  {documents.quickReference.status}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePreview(documents.quickReference!.downloadUrl)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <a
                  href={documents.quickReference.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Processed Documents */}
        {documents.processedDocuments && documents.processedDocuments.length > 0 && (
          <div>
            <h6 className="text-white font-medium mb-4 flex items-center space-x-2">
              <Share2 className="w-4 h-4 text-gray-400" />
              <span>Additional Formats & Sharing Options</span>
            </h6>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.processedDocuments.map((doc, index) => (
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
                    {doc.size && (
                      <span className="text-xs text-gray-500">
                        {Math.round(doc.size / 1024)}KB
                      </span>
                    )}
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-xs font-medium flex items-center space-x-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Get</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border-l-4 border-purple-500">
          <h6 className="text-white font-medium mb-2">💡 Tips for Your Style Documents</h6>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Save the mobile version for shopping trips</li>
            <li>• Share social images to get style feedback</li>
            <li>• Use the quick reference for outfit planning</li>
            <li>• Keep the complete guide for seasonal updates</li>
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
                target="_blank"
                rel="noopener noreferrer"
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