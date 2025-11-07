// FIX: Reconstructed the component from a truncated source file and added the missing default export.
import React, { useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';

interface ViewHeaderProps {
    title: string;
    imageUrl?: string | null;
    onImageUpload?: (file: File) => void;
    placeholderText?: string;
    children?: React.ReactNode;
}

const ViewHeader: React.FC<ViewHeaderProps> = ({ title, imageUrl, onImageUpload, placeholderText, children }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useI18n();

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onImageUpload) {
            onImageUpload(file);
        }
    };

    return (
        <div>
            {/* Input is available but hidden if onImageUpload is provided */}
            {onImageUpload && (
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
            )}

            {/* Banner Display Logic */}
            {imageUrl ? (
                // If there's an image, always display it.
                <div className="relative w-full aspect-[767/325] max-h-[325px] rounded-lg overflow-hidden shadow-lg mb-4 group">
                    <img src={imageUrl} alt={`${title} banner`} className="w-full h-full object-cover" />
                    {/* The edit overlay is ONLY shown if onImageUpload is provided (i.e., for admins) */}
                    {onImageUpload && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                            <button 
                                onClick={handleButtonClick}
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-60 rounded-full p-3"
                                aria-label="Edit banner"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                // If there's no image, only show the upload placeholder if onImageUpload is provided.
                onImageUpload && (
                    <div className="w-full aspect-[767/325] max-h-[325px] rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-center text-text-secondary p-4 mb-4 hover:border-accent transition-colors">
                        <button onClick={handleButtonClick} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                            {t('viewHeader.uploadBanner')}
                        </button>
                        <p className="text-sm mt-2">{t('viewHeader.bannerSize')}</p>
                    </div>
                )
            )}
            
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Cinzel Decorative', serif" }}>
                    {title || placeholderText}
                </h2>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ViewHeader;