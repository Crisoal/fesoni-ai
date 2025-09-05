// src/components/StyleDocumentToolbar.tsx
import React, { useState } from 'react';
import { 
  FileText, 
  Share2, 
  Scissors, 
  Link, 
  Download, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Instagram,
  Facebook
} from 'lucide-react';
import { FoxitService, StylePortfolioData } from '../services/foxitService';

interface StyleDocuments {
  mainDocument?: string;
  documentId?: string;
  processedVersions?: Array<{
    type: string;
    taskId: string;
    status?: 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    size?: number;
  }>;
}

interface StyleDocumentToolbarProps {
  documents: StyleDocuments;
  portfolioData: StylePortfolioData;
  onDownloadDocument: (documentIdOrUrl: string, filename?: string) => Promise<Blob>;
  foxitService: FoxitService;
}

interface SocialImageFormat {
  name: string;
  dimensions: string;
  width: number;
  height: number;
  description: string;
}

interface SplitOption {
  id: string;
  name: string;
  description: string;
  pageRange?: string;
}

interface MergeOption {
  id: string;
  name: string;
  description: string;
  additionalContent: string;
}

const StyleDocumentToolbar: React.FC<StyleDocumentToolbarProps> = ({
  documents,
  portfolioData,
  onDownloadDocument,
  foxitService
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [completedTasks, setCompletedTasks] = useState<Array<{
    type: string;
    filename: string;
    downloadUrl?: string;
  }>>([]);

  // Social media format options
  const socialFormats: SocialImageFormat[] = [
    {
      name: 'Instagram Square',
      dimensions: '1080x1080px',
      width: 1080,
      height: 1080,
      description: 'Perfect for Instagram posts and Pinterest'
    },
    {
      name: 'Pinterest Vertical',
      dimensions: '735x1102px', 
      width: 735,
      height: 1102,
      description: 'Optimized for Pinterest pins'
    },
    {
      name: 'Instagram Stories',
      dimensions: '1080x1920px',
      width: 1080,
      height: 1920,
      description: 'Vertical format for Stories'
    },
    {
      name: 'Facebook Square',
      dimensions: '1200x1200px',
      width: 1200,
      height: 1200,
      description: 'Square format for Facebook posts'
    }
  ];

  // Split guide options
  const splitOptions: SplitOption[] = [
    {
      id: 'tops',
      name: 'Tops Focus',
      description: 'Style profile + tops/blouses + styling tips',
      pageRange: '1,2'
    },
    {
      id: 'bottoms',
      name: 'Bottoms Focus', 
      description: 'Style profile + bottoms + styling tips',
      pageRange: '1,3'
    },
    {
      id: 'accessories',
      name: 'Accessories Focus',
      description: 'Style profile + accessories/shoes + tips',
      pageRange: '1,4'
    },
    {
      id: 'outfits',
      name: 'Outfits Focus',
      description: 'Style profile + complete outfit combinations',
      pageRange: '1,5'
    }
  ];

  // Merge options  
  const mergeOptions: MergeOption[] = [
    {
      id: 'trend-report',
      name: 'Trend Report',
      description: 'Add seasonal trends and forecasts',
      additionalContent: 'Spring 2025 trends, color forecasts, key pieces for the season'
    },
    {
      id: 'care-guide',
      name: 'Care Instructions',
      description: 'Add fabric care and maintenance guide', 
      additionalContent: 'Linen care, cotton maintenance, vintage preservation, stain removal'
    },
    {
      id: 'size-fit',
      name: 'Size & Fit Guide',
      description: 'Add sizing charts and fit recommendations',
      additionalContent: 'Brand sizing, measurements, fit preferences, return policies'
    },
    {
      id: 'master-collection',
      name: 'Master Collection',
      description: 'Complete package with all additions',
      additionalContent: 'Trends + Care + Sizing + Advanced styling tips'
    }
  ];

  const handleDownloadMainDocument = async () => {
    if (!documents.mainDocument) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Preparing your style guide...');
      
      // Convert base64 to blob
      const byteCharacters = atob(documents.mainDocument);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${portfolioData.userPreferences.aesthetics.join('_')}_Style_Guide.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setProcessingStatus('Downloaded successfully!');
      setTimeout(() => setIsProcessing(false), 1000);
    } catch (error) {
      console.error('Download error:', error);
      setProcessingStatus('Download failed');
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const handleCreateSocialImages = async (selectedFormats: SocialImageFormat[]) => {
    if (!documents.documentId) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Creating social media images...');
      const newTasks: Array<{ type: string; filename: string; downloadUrl?: string }> = [];
      
      for (const format of selectedFormats) {
        try {
          setProcessingStatus(`Creating ${format.name}...`);
          
          // Convert PDF pages to images with specific dimensions
          const task = await foxitService.convertToImages(
            documents.documentId,
            '1-3', // First 3 pages for social sharing
            200 // High DPI for quality
          );
          
          // Poll for completion
          let attempts = 0;
          const maxAttempts = 20;
          
          while (attempts < maxAttempts) {
            const status = await foxitService.checkTaskStatus(task.taskId);
            
            if (status.status === 'completed') {
              newTasks.push({
                type: 'social-image',
                filename: `${format.name.replace(/\s+/g, '_')}_${portfolioData.userPreferences.aesthetics.join('_')}.zip`,
                downloadUrl: status.downloadUrl || status.documentId
              });
              break;
            } else if (status.status === 'failed') {
              throw new Error(`Failed to create ${format.name}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
          
        } catch (error) {
          console.error(`Failed to create ${format.name}:`, error);
        }
      }
      
      setCompletedTasks(prev => [...prev, ...newTasks]);
      setProcessingStatus(`Created ${newTasks.length} social image sets!`);
      setTimeout(() => setIsProcessing(false), 2000);
      
    } catch (error) {
      console.error('Social image creation error:', error);
      setProcessingStatus('Failed to create social images');
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const handleSplitDocument = async (selectedOptions: SplitOption[]) => {
    if (!documents.documentId) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Splitting your style guide...');
      const newTasks: Array<{ type: string; filename: string; downloadUrl?: string }> = [];
      
      for (const option of selectedOptions) {
        try {
          setProcessingStatus(`Creating ${option.name}...`);
          
          // Extract specific pages for this split
          const task = await foxitService.extractFromDocument(
            documents.documentId,
            'PAGE',
            option.pageRange
          );
          
          // Poll for completion
          let attempts = 0;
          const maxAttempts = 20;
          
          while (attempts < maxAttempts) {
            const status = await foxitService.checkTaskStatus(task.taskId);
            
            if (status.status === 'completed') {
              newTasks.push({
                type: 'split-guide',
                filename: `${portfolioData.userPreferences.aesthetics.join('_')}_${option.name.replace(/\s+/g, '_')}_Guide.pdf`,
                downloadUrl: status.downloadUrl || status.documentId
              });
              break;
            } else if (status.status === 'failed') {
              throw new Error(`Failed to create ${option.name}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
          
        } catch (error) {
          console.error(`Failed to create ${option.name}:`, error);
        }
      }
      
      setCompletedTasks(prev => [...prev, ...newTasks]);
      setProcessingStatus(`Created ${newTasks.length} split guides!`);
      setTimeout(() => setIsProcessing(false), 2000);
      
    } catch (error) {
      console.error('Document split error:', error);
      setProcessingStatus('Failed to split document');
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const handleMergeDocument = async (selectedOptions: MergeOption[]) => {
    if (!documents.documentId) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Creating merged documents...');
      const newTasks: Array<{ type: string; filename: string; downloadUrl?: string }> = [];
      
      for (const option of selectedOptions) {
        try {
          setProcessingStatus(`Creating ${option.name} package...`);
          
          // Generate additional content based on merge option
          const additionalDoc = await createAdditionalContent(option, portfolioData);
          
          if (additionalDoc) {
            // Combine with main document
            const task = await foxitService.combineDocuments(
              [documents.documentId, additionalDoc.documentId],
              {
                addBookmark: true,
                continueMergeOnError: true,
                retainPageNumbers: false,
                addToc: true,
                tocTitle: `${portfolioData.userPreferences.aesthetics.join(' + ')} Complete Guide`
              }
            );
            
            // Poll for completion
            let attempts = 0;
            const maxAttempts = 20;
            
            while (attempts < maxAttempts) {
              const status = await foxitService.checkTaskStatus(task.taskId);
              
              if (status.status === 'completed') {
                newTasks.push({
                  type: 'merged-guide',
                  filename: `${portfolioData.userPreferences.aesthetics.join('_')}_${option.name.replace(/\s+/g, '_')}_Package.pdf`,
                  downloadUrl: status.downloadUrl || status.documentId
                });
                break;
              } else if (status.status === 'failed') {
                throw new Error(`Failed to create ${option.name} package`);
              }
              
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;
            }
          }
          
        } catch (error) {
          console.error(`Failed to create ${option.name}:`, error);
        }
      }
      
      setCompletedTasks(prev => [...prev, ...newTasks]);
      setProcessingStatus(`Created ${newTasks.length} merged packages!`);
      setTimeout(() => setIsProcessing(false), 2000);
      
    } catch (error) {
      console.error('Document merge error:', error);
      setProcessingStatus('Failed to merge documents');
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const createAdditionalContent = async (
    option: MergeOption, 
    portfolioData: StylePortfolioData
  ): Promise<{ documentId: string } | null> => {
    try {
      // Get additional content template based on option type
      const templateBase64 = await getAdditionalContentTemplate(option.id);
      
      // Prepare data for additional content
      const additionalData = prepareAdditionalContentData(option, portfolioData);
      
      // Generate additional document
      const generatedDoc = await foxitService.generateDocumentFromTemplate(
        templateBase64,
        additionalData,
        'pdf'
      );
      
      // Upload generated document
      const byteCharacters = atob(generatedDoc.base64FileString);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const uploadResult = await foxitService.uploadDocument(blob, `additional-${option.id}.pdf`);
      
      return { documentId: uploadResult.documentId };
      
    } catch (error) {
      console.error(`Failed to create additional content for ${option.id}:`, error);
      return null;
    }
  };

  const getAdditionalContentTemplate = async (optionId: string): Promise<string> => {
    // In a real implementation, you'd have different templates for each option
    // For now, we'll use a simplified approach
    const templateResponse = await fetch(`/assets/templates/${optionId}-template.docx`);
    
    if (!templateResponse.ok) {
      // Fallback to a generic additional content template
      const fallbackResponse = await fetch('/assets/templates/additional-content-template.docx');
      if (!fallbackResponse.ok) {
        throw new Error(`Template not found for ${optionId}`);
      }
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    }
    
    const arrayBuffer = await templateResponse.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  };

  const prepareAdditionalContentData = (
    option: MergeOption, 
    portfolioData: StylePortfolioData
  ): Record<string, unknown> => {
    const baseData = {
      userName: portfolioData.metadata.userName || 'Style Enthusiast',
      createdDate: new Date().toLocaleDateString(),
      aesthetics: portfolioData.userPreferences.aesthetics.join(' + '),
      season: portfolioData.metadata.season || 'Current Season'
    };

    switch (option.id) {
      case 'trend-report':
        return {
          ...baseData,
          trendTitle: `${portfolioData.metadata.season} ${new Date().getFullYear()} Trends`,
          keyTrends: generateTrendContent(portfolioData.userPreferences.aesthetics),
          colorTrends: generateColorTrends(portfolioData.metadata.season || 'Spring'),
          keyPieces: generateKeyPieces(portfolioData.userPreferences.aesthetics)
        };
        
      case 'care-guide':
        return {
          ...baseData,
          fabricCare: generateFabricCareGuide(portfolioData.userPreferences.aesthetics),
          stainRemoval: generateStainRemovalTips(),
          storageeTips: generateStorageTips()
        };
        
      case 'size-fit':
        return {
          ...baseData,
          sizingCharts: generateSizingCharts(),
          fitTips: generateFitTips(portfolioData.userPreferences.aesthetics),
          measurementGuide: generateMeasurementGuide()
        };
        
      case 'master-collection':
        return {
          ...baseData,
          allContent: 'Complete package with trends, care instructions, sizing, and advanced styling'
        };
        
      default:
        return baseData;
    }
  };

  const generateTrendContent = (aesthetics: string[]): string => {
    // Generate trend content based on aesthetics
    return aesthetics.map(aesthetic => {
      switch (aesthetic.toLowerCase()) {
        case 'cottagecore':
          return '• Romantic florals and prairie dresses trending\n• Natural fabrics gaining popularity\n• Vintage-inspired details in high demand';
        case 'minimalist':
          return '• Clean lines and neutral tones dominating\n• Quality basics over trendy pieces\n• Sustainable fashion focus increasing';
        default:
          return `• ${aesthetic} aesthetic gaining mainstream appeal\n• Focus on authentic personal expression\n• Quality over quantity trend continues`;
      }
    }).join('\n\n');
  };

  const generateColorTrends = (season: string): string => {
    const seasonalColors = {
      'Spring': 'Soft pastels, sage green, warm coral, butter yellow',
      'Summer': 'Ocean blues, coral pink, sandy beige, sunset orange', 
      'Fall': 'Rich burgundy, forest green, warm browns, golden yellow',
      'Winter': 'Deep navy, emerald green, berry tones, classic black'
    };
    return seasonalColors[season as keyof typeof seasonalColors] || 'Classic neutrals with seasonal accent colors';
  };

  const generateKeyPieces = (aesthetics: string[]): string => {
    return aesthetics.map(aesthetic => {
      switch (aesthetic.toLowerCase()) {
        case 'cottagecore':
          return '• Midi prairie skirts\n• Puff sleeve blouses\n• Wicker accessories\n• Mary Jane shoes';
        case 'minimalist':
          return '• Quality white button-down\n• Well-fitted trousers\n• Classic trench coat\n• Leather loafers';
        default:
          return '• Versatile blazer\n• Quality jeans\n• Classic white tee\n• Comfortable sneakers';
      }
    }).join('\n\n');
  };

  const generateFabricCareGuide = (aesthetics: string[]): string => {
    return 'Cotton: Machine wash cool, tumble dry low\nLinen: Hand wash or gentle cycle, air dry\nWool: Dry clean or hand wash cool\nSilk: Hand wash or dry clean only\nDenim: Wash inside out, cold water';
  };

  const generateStainRemovalTips = (): string => {
    return 'Oil stains: Dish soap and warm water\nBlood: Cold water and hydrogen peroxide\nSweat: White vinegar and baking soda\nMakeup: Makeup remover then regular wash\nGrass: Rubbing alcohol then wash';
  };

  const generateStorageTips = (): string => {
    return 'Hang delicate items\nFold knitwear to prevent stretching\nUse cedar blocks for moths\nStore shoes with trees\nKeep accessories organized in compartments';
  };

  const generateSizingCharts = (): string => {
    return 'US sizing varies by brand - always check individual size charts\nEuropean sizes run differently than US\nConsult brand-specific sizing guides\nConsider fabric stretch when choosing size';
  };

  const generateFitTips = (aesthetics: string[]): string => {
    return aesthetics.map(aesthetic => {
      switch (aesthetic.toLowerCase()) {
        case 'cottagecore':
          return 'Embrace relaxed, flowing fits\nHigh-waisted bottoms are flattering\nLayer pieces for depth and interest';
        case 'minimalist':
          return 'Focus on clean, tailored silhouettes\nEnsure proper shoulder fit\nAvoid excess fabric or tight fits';
        default:
          return 'Choose fits that flatter your body type\nEnsure comfort and ease of movement\nTailor key pieces for perfect fit';
      }
    }).join('\n\n');
  };

  const generateMeasurementGuide = (): string => {
    return 'Bust: Measure around fullest part\nWaist: Measure at natural waistline\nHips: Measure around fullest part\nInseam: Measure from crotch to ankle\nShoulder: Measure from shoulder point to shoulder point';
  };

  const handleDownloadTask = async (task: { filename: string; downloadUrl?: string }) => {
    if (!task.downloadUrl) return;
    
    try {
      const blob = await onDownloadDocument(task.downloadUrl, task.filename);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = task.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end space-x-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
        {/* Style Guide Button */}
        <button
          onClick={handleDownloadMainDocument}
          disabled={!documents.mainDocument || isProcessing}
          className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          title="Download complete style guide"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm">Style Guide</span>
        </button>

        {/* Social Share Images Button */}
        <button
          onClick={() => setActiveModal('social')}
          disabled={!documents.documentId || isProcessing}
          className="flex items-center space-x-2 px-3 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          title="Create social media images"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Social Images</span>
        </button>

        {/* Split Guides Button */}
        <button
          onClick={() => setActiveModal('split')}
          disabled={!documents.documentId || isProcessing}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          title="Split guide by category"
        >
          <Scissors className="w-4 h-4" />
          <span className="text-sm">Split Guides</span>
        </button>

        {/* Merge Options Button */}
        <button
          onClick={() => setActiveModal('merge')}
          disabled={!documents.documentId || isProcessing}
          className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          title="Merge with additional content"
        >
          <Link className="w-4 h-4" />
          <span className="text-sm">Merge Options</span>
        </button>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-sm text-blue-300">{processingStatus}</span>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Ready for Download:</h4>
          <div className="space-y-2">
            {completedTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">{task.filename}</span>
                </div>
                <button
                  onClick={() => handleDownloadTask(task)}
                  className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Social Images Modal */}
      {activeModal === 'social' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Create Social Media Images</h3>
              <p className="text-gray-300 mb-6">
                Generate perfectly sized images for your social media platforms. Select the formats you want:
              </p>
              
              <div className="space-y-4 mb-6">
                {socialFormats.map((format) => (
                  <label key={format.name} className="flex items-start space-x-3 p-3 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                      defaultChecked={format.name === 'Instagram Square' || format.name === 'Pinterest Vertical'}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {format.name.includes('Instagram') && <Instagram className="w-4 h-4 text-pink-500" />}
                        {format.name.includes('Facebook') && <Facebook className="w-4 h-4 text-blue-500" />}
                        <h4 className="font-medium text-white">{format.name}</h4>
                        <span className="text-sm text-gray-400">{format.dimensions}</span>
                      </div>
                      <p className="text-sm text-gray-400">{format.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    const selectedFormats = Array.from(checkboxes).map((_, index) => socialFormats[index]).filter(Boolean);
                    handleCreateSocialImages(selectedFormats);
                    setActiveModal(null);
                  }}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create Images
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Guides Modal */}
      {activeModal === 'split' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Split Style Guide</h3>
              <p className="text-gray-300 mb-6">
                Create focused guides for specific categories. Each split will include your style profile plus the selected category:
              </p>
              
              <div className="space-y-4 mb-6">
                {splitOptions.map((option) => (
                  <label key={option.id} className="flex items-start space-x-3 p-3 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      defaultChecked={option.id === 'tops' || option.id === 'outfits'}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{option.name}</h4>
                      <p className="text-sm text-gray-400">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    const selectedOptions = Array.from(checkboxes).map((_, index) => splitOptions[index]).filter(Boolean);
                    handleSplitDocument(selectedOptions);
                    setActiveModal(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create Split Guides
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Options Modal */}
      {activeModal === 'merge' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Merge Additional Content</h3>
              <p className="text-gray-300 mb-6">
                Enhance your style guide with additional sections. Select what you'd like to add:
              </p>
              
              <div className="space-y-4 mb-6">
                {mergeOptions.map((option) => (
                  <label key={option.id} className="flex items-start space-x-3 p-3 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500"
                      defaultChecked={option.id === 'trend-report'}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{option.name}</h4>
                      <p className="text-sm text-gray-400 mb-2">{option.description}</p>
                      <p className="text-xs text-gray-500">{option.additionalContent}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    const selectedOptions = Array.from(checkboxes).map((_, index) => mergeOptions[index]).filter(Boolean);
                    handleMergeDocument(selectedOptions);
                    setActiveModal(null);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create Merged Guides
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleDocumentToolbar;