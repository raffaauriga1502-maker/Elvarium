
import React, { useState, useEffect } from 'react';
import ViewHeader from './ViewHeader';
import { User } from '../types';
import * as apiService from '../services/apiService';
import { useI18n } from '../contexts/I18nContext';


interface HomeViewProps {
    userRole: User['role'];
}

const isQuotaExceededError = (error: any) => {
    return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
};

const HomeView: React.FC<HomeViewProps> = ({ userRole }) => {
    const { t } = useI18n();
    const [synopsis, setSynopsis] = useState('');
    const [editedSynopsis, setEditedSynopsis] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [bgUrl, setBgUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [savedSynopsis, bannerKey, bgKey] = await Promise.all([
                apiService.getSynopsis(),
                apiService.getSynopsisBanner(),
                apiService.getHomeBackground()
            ]);
            const synopsisContent = savedSynopsis || ''; // Load empty string if nothing saved
            setSynopsis(synopsisContent);
            setEditedSynopsis(synopsisContent);
            if (bannerKey) {
                apiService.resolveImageUrl(bannerKey).then(setBannerUrl);
            }
            if (bgKey) {
                apiService.resolveImageUrl(bgKey).then(setBgUrl);
            }
        };
        loadData();
    }, []); // Empty dependency array: run only once on mount

    const handleBannerUpload = async (file: File) => {
        try {
            const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 1200, maxHeight: 600, quality: 0.7 });
            await apiService.saveSynopsisBanner(imageKey);
            const resolvedUrl = await apiService.resolveImageUrl(imageKey);
            setBannerUrl(resolvedUrl);
        } catch (error) {
            console.error("Error processing banner image:", error);
            alert(t('home.errors.bannerProcessing'));
        }
    };

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
             try {
                const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.8 });
                await apiService.saveHomeBackground(imageKey);
                const resolved = await apiService.resolveImageUrl(imageKey);
                setBgUrl(resolved);
            } catch (error) {
                console.error("Error processing background:", error);
            }
        }
    };

    const handleEdit = () => {
        setEditedSynopsis(synopsis);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const oldSynopsis = synopsis;
        setSynopsis(editedSynopsis); // Optimistic update
        try {
            await apiService.saveSynopsis(editedSynopsis);
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving synopsis:", error);
            if (isQuotaExceededError(error)) {
                alert(t('home.errors.saveSynopsisQuota'));
            } else {
                alert(t('home.errors.saveSynopsisGeneric'));
            }
            setSynopsis(oldSynopsis); // Rollback
        } finally {
            setIsSaving(false);
        }
    };

    const renderContent = () => {
        if (isEditing && userRole === 'admin') {
            return (
                <textarea
                    value={editedSynopsis}
                    onChange={(e) => setEditedSynopsis(e.target.value)}
                    className="w-full max-w-prose mx-auto h-96 block bg-secondary text-text-primary p-4 rounded-md border border-slate-600 focus:ring-accent focus:border-accent transition"
                    aria-label={t('home.aria.synopsisEditor')}
                />
            );
        }
        
        const displaySynopsis = synopsis || t('home.defaultSynopsis');

        return (
            <div className="prose prose-invert max-w-prose mx-auto prose-p:text-text-primary prose-headings:text-white">
                {displaySynopsis.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </div>
        );
    };
    
    const bgStyle = bgUrl ? {
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
    } : undefined;

    return (
        <div className="min-h-full p-6 md:p-8 relative" style={bgStyle}>
             {userRole === 'admin' && (
                 <div className="absolute top-4 right-4 z-10">
                    <label className="bg-secondary/80 hover:bg-secondary text-text-primary p-2 rounded-full cursor-pointer transition-colors backdrop-blur-sm flex items-center justify-center shadow-md border border-slate-600" title={t('characterCard.editBackground')}>
                        <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                    </label>
                 </div>
             )}
             <div className="max-w-4xl mx-auto">
                <ViewHeader 
                    title={t('home.synopsis')}
                    imageUrl={bannerUrl} 
                    onImageUpload={userRole === 'admin' ? handleBannerUpload : undefined} 
                    placeholderText="Elvarium"
                />
                 <div className="mt-6 mb-4 text-right">
                    {userRole === 'admin' && (
                        isEditing ? (
                            <div className="flex gap-2 justify-end">
                                <button onClick={handleSave} disabled={isSaving} className="bg-accent hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                                    {isSaving ? t('home.saving') : t('home.saveSynopsis')}
                                </button>
                                <button onClick={handleCancel} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                                    {t('home.cancel')}
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleEdit} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                                {t('home.editSynopsis')}
                            </button>
                        )
                    )}
                </div>
                <div className="mt-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default HomeView;
