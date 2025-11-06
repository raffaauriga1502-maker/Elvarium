import React, { useState, useEffect } from 'react';
import ViewHeader from './ViewHeader';
import { User } from '../types';

interface HomeViewProps {
    userRole: User['role'];
}

const DEFAULT_SYNOPSIS = "This is where your novel's synopsis will appear. Click the 'Edit Synopsis' button above to start writing!";

const HomeView: React.FC<HomeViewProps> = ({ userRole }) => {
    const [synopsis, setSynopsis] = useState('');
    const [editedSynopsis, setEditedSynopsis] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);

    useEffect(() => {
        const savedSynopsis = localStorage.getItem('elvarium-synopsis') || DEFAULT_SYNOPSIS;
        setSynopsis(savedSynopsis);
        setEditedSynopsis(savedSynopsis);
    }, []);

    useEffect(() => {
        return () => {
            if (bannerUrl && bannerUrl.startsWith('blob:')) {
                URL.revokeObjectURL(bannerUrl);
            }
        };
    }, [bannerUrl]);


    const handleBannerUpload = (file: File) => {
        setBannerUrl(URL.createObjectURL(file));
    };

    const handleEdit = () => {
        setEditedSynopsis(synopsis);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSave = () => {
        setSynopsis(editedSynopsis);
        localStorage.setItem('elvarium-synopsis', editedSynopsis);
        setIsEditing(false);
    };

    const renderContent = () => {
        if (isEditing && userRole === 'admin') {
            return (
                <textarea
                    value={editedSynopsis}
                    onChange={(e) => setEditedSynopsis(e.target.value)}
                    className="w-full max-w-prose mx-auto h-96 block bg-secondary text-text-primary p-4 rounded-md border border-slate-600 focus:ring-accent focus:border-accent transition"
                    aria-label="Synopsis editor"
                />
            );
        }

        return (
            <div className="prose prose-invert max-w-prose mx-auto prose-p:text-text-primary prose-headings:text-white">
                {synopsis.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-crystalline rounded-xl shadow-lg p-6 md:p-8">
            <ViewHeader 
                title="Synopsis" 
                imageUrl={bannerUrl} 
                onImageUpload={userRole === 'admin' ? handleBannerUpload : undefined} 
                placeholderText="Elvarium"
            />
             <div className="mt-6 mb-4 text-right">
                {userRole === 'admin' && (
                    isEditing ? (
                        <div className="flex gap-2 justify-end">
                            <button onClick={handleSave} className="bg-accent hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Save Synopsis
                            </button>
                            <button onClick={handleCancel} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleEdit} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                            Edit Synopsis
                        </button>
                    )
                )}
            </div>
            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default HomeView;