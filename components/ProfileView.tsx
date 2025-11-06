import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import ViewHeader from './ViewHeader';
import * as apiService from '../services/apiService';

interface ProfileViewProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState<User>(user);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditedUser(user);
    }, [user]);

    const handleAvatarClick = () => {
        if (isEditing) {
            avatarInputRef.current?.click();
        }
    };
    
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64String = await apiService.imageFileToBase64(file, 256, 256, 0.9);
                setEditedUser(prev => ({ ...prev, avatarUrl: base64String }));
            } catch (error) {
                console.error("Error processing avatar image:", error);
                alert("There was an error processing the avatar image.");
            }
        }
    };

    const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedUser(prev => ({...prev, bio: e.target.value}));
    };

    const handleSave = () => {
        onUserUpdate(editedUser);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedUser(user);
        setIsEditing(false);
    };

    const roleColor = user.role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-slate-600 text-slate-300';

    return (
        <div className="bg-crystalline rounded-xl shadow-lg p-6 md:p-8">
            <ViewHeader title={`${user.username}'s Profile`}>
                {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="bg-accent hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Save
                        </button>
                        <button onClick={handleCancel} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-2 px-4 rounded-md transition-colors">
                        Edit Profile
                    </button>
                )}
            </ViewHeader>

            <div className="mt-8 flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="flex-shrink-0 text-center">
                    <input 
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <div 
                        className={`relative w-40 h-40 rounded-full bg-secondary border-4 border-slate-600 overflow-hidden group ${isEditing ? 'cursor-pointer hover:border-accent' : ''} transition-colors`}
                        onClick={handleAvatarClick}
                        aria-label={isEditing ? 'Change avatar' : 'User avatar'}
                    >
                        {editedUser.avatarUrl ? (
                            <img src={editedUser.avatarUrl} alt="User avatar" className="w-full h-full object-cover" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-slate-500 p-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        )}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>
                     <span className={`mt-4 inline-block px-3 py-1 text-sm font-semibold rounded-full ${roleColor}`}>
                        {user.role}
                    </span>
                </div>

                <div className="w-full">
                    <h3 className="text-2xl font-bold text-accent mb-3 border-b-2 border-accent/30 pb-2" style={{ fontFamily: "'Cinzel Decorative', serif" }}>
                        Bio
                    </h3>
                    {isEditing ? (
                        <textarea
                            value={editedUser.bio || ''}
                            onChange={handleBioChange}
                            rows={8}
                            className="w-full bg-secondary text-text-primary p-4 rounded-md border border-slate-600 focus:ring-accent focus:border-accent transition"
                            placeholder="Tell us a little about yourself..."
                        />
                    ) : (
                        <div className="prose prose-invert max-w-none prose-p:text-text-primary">
                            {user.bio ? (
                                user.bio.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)
                            ) : (
                                <p className="text-text-secondary italic">No bio provided.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
