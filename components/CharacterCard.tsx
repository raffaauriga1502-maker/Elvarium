import React, { useRef, useState, useEffect } from 'react';
import { Character, Portrait, Outfit, GalleryImage, User } from '../types';
import RadarChart from './RadarChart';
import BarChart from './BarChart';
import ImageModal from './ImageModal';
import * as apiService from '../services/apiService';
import * as idbService from '../services/idbService';
import { useI18n } from '../contexts/I18nContext';


interface CharacterCardProps {
  character: Character;
  onUpdate: (character: Character) => void;
  onDelete: (id: string) => void;
  userRole: User['role'];
  isNewlyAdded?: boolean;
}

const STAT_KEYS: (keyof Character['stats'])[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

// Helper hook to resolve an image key from IDB into a displayable object URL
const useResolvedImageUrl = (imageKey?: string | null) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    useEffect(() => {
        let isCancelled = false;
        if (imageKey) {
            apiService.resolveImageUrl(imageKey).then(url => {
                if (!isCancelled) {
                    setImageUrl(url);
                }
            });
        } else {
            setImageUrl(null);
        }
        return () => {
            isCancelled = true;
            // The browser will handle cleanup on page unload.
        };
    }, [imageKey]);
    return imageUrl;
};


const EditableInfoBlock: React.FC<{ 
    title: string; 
    content: string; 
    isEditing: boolean;
    name: keyof Pick<Character, 'birthplace' | 'age' | 'height' | 'weight' | 'bloodType' | 'status'>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}> = ({ title, content, isEditing, name, onChange }) => {
    const { t } = useI18n();
    return (
        <div className="bg-primary/60 backdrop-blur-sm p-3 rounded-lg">
            <h4 className="font-semibold text-accent/80 text-sm uppercase tracking-wider mb-1">{title}</h4>
            {isEditing ? (
                name === 'status' ? (
                    <select
                        name={name}
                        value={content}
                        onChange={onChange}
                        className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"
                    >
                        <option value={t('characterCard.statusOptions.alive')}>{t('characterCard.statusOptions.alive')}</option>
                        <option value={t('characterCard.statusOptions.deceased')}>{t('characterCard.statusOptions.deceased')}</option>
                        <option value={t('characterCard.statusOptions.unknown')}>{t('characterCard.statusOptions.unknown')}</option>
                    </select>
                ) : (
                    <input
                        type="text"
                        name={name}
                        value={content}
                        onChange={onChange}
                        className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"
                    />
                )
            ) : (
                <p className={`text-text-primary whitespace-pre-wrap min-h-[1.5rem] ${content === t('characterCard.statusOptions.deceased') ? 'text-red-400 font-semibold' : ''}`}>{content}</p>
            )}
        </div>
    );
};

const SimpleEditableSection: React.FC<{ 
    title: string; 
    content: string; 
    isEditing: boolean;
    name: keyof Pick<Character, 'about' | 'biography' | 'personality' | 'appearanceDescription' | 'powers' | 'relationships' | 'trivia'>;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}> = ({ title, content, isEditing, name, onChange }) => {
    const { t } = useI18n();
    return (
        <div>
            <div className="flex justify-between items-center mb-3 border-b-2 border-accent/30 pb-2">
                <h3 className="text-2xl font-bold text-accent font-display">{title}</h3>
            </div>
            {isEditing ? (
                 <textarea
                    name={name}
                    value={content}
                    onChange={onChange}
                    rows={10}
                    className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"
                    placeholder={t('characterCard.placeholders.details')}
                />
            ) : (
                <div className="prose prose-invert max-w-none prose-p:text-text-primary whitespace-pre-wrap">
                    {content ? content.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p className="text-text-secondary">{t('characterCard.noInformation')}</p>}
                </div>
            )}
        </div>
    );
};


const CharacterCard: React.FC<CharacterCardProps> = ({ character, onUpdate, onDelete, userRole, isNewlyAdded = false }) => {
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const dossierContainerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCharacter, setEditedCharacter] = useState<Character>(character);
  const [chartType, setChartType] = useState<'radar' | 'bar' | null>(null);
  const [modalImage, setModalImage] = useState<{src: string, alt: string} | null>(null);
  const [selectedPortraitIndex, setSelectedPortraitIndex] = useState(0);
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState<number | null>(null);
  const { t } = useI18n();
  const displayedCharacterId = useRef<string | null>(null);
  
  const resolvedBgUrl = useResolvedImageUrl(editedCharacter.backgroundImageUrl);
  
  useEffect(() => {
    // This effect synchronizes the component's state with the `character` prop.
    // It should ONLY run when the character prop changes to a different character.
    if (character.id !== displayedCharacterId.current) {
        displayedCharacterId.current = character.id;

        // A new character has been selected from the list.
        // Reset all local state to reflect the new character.
        setEditedCharacter(character);
        setChartType(null);
        setSelectedPortraitIndex(0);
        setSelectedOutfitIndex(null);

        // Determine if this new character should start in edit mode.
        setIsEditing(isNewlyAdded && userRole === 'admin');
    }
  }, [character, isNewlyAdded, userRole]);


  // Derived state for easier access
  const currentPortrait = editedCharacter.portraits?.[selectedPortraitIndex];
  const currentOutfit = selectedOutfitIndex !== null ? currentPortrait?.outfits?.[selectedOutfitIndex] : null;
  const resolvedOutfitUrl = useResolvedImageUrl(currentOutfit?.imageUrl);
  const resolvedPortraitUrl = useResolvedImageUrl(currentPortrait?.imageUrl);
  
  const displayedImageUrl = (currentOutfit && resolvedOutfitUrl) ? resolvedOutfitUrl : resolvedPortraitUrl;
  const displayedImageAlt = (currentOutfit && resolvedOutfitUrl) 
    ? `${editedCharacter.name} - ${currentOutfit.arcName}` 
    : `${editedCharacter.name} - ${currentPortrait?.name}`;


  const handleBackgroundFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        try {
            const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 1280, maxHeight: 720, quality: 0.7 });
            setEditedCharacter(prev => ({ ...prev, backgroundImageUrl: imageKey }));
        } catch (error) {
            console.error("Error processing background image:", error);
            alert("There was an error processing the background image.");
        }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'arcs') {
        setEditedCharacter(prev => ({...prev, arcs: value.split(',').map(s => s.trim()).filter(Boolean)}));
    } else {
        setEditedCharacter(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setEditedCharacter(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleStatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setEditedCharacter(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              [name]: Number(value) || 0,
            }
        }));
  };
  
  // --- Portrait Handlers ---
  const handlePortraitChange = (index: number, field: 'name', value: string) => {
    setEditedCharacter(prev => ({
      ...prev,
      portraits: prev.portraits.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const handlePortraitImageChange = async (index: number, file: File) => {
    try {
      const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.8 });
      setEditedCharacter(prev => ({
        ...prev,
        portraits: prev.portraits.map((p, i) => i === index ? { ...p, imageUrl: imageKey } : p)
      }));
    } catch (error) {
      console.error("Error processing portrait image:", error);
    }
  };
  
  const handleAddPortrait = () => {
    const newPortrait: Portrait = {
      id: crypto.randomUUID(),
      name: t('characterCard.newPortraitName'),
      imageUrl: '',
      outfits: [{ id: crypto.randomUUID(), arcName: t('characters.newCharacter.defaultArcName'), imageUrl: '' }],
    };
    setEditedCharacter(prev => ({
      ...prev,
      portraits: [...prev.portraits, newPortrait]
    }));
  };
  
  const handleDeletePortrait = (index: number) => {
    if (editedCharacter.portraits.length <= 1) {
      alert(t('characterCard.atLeastOnePortrait'));
      return;
    }
    setEditedCharacter(prev => {
      const newIndex = selectedPortraitIndex >= prev.portraits.length - 1 ? prev.portraits.length - 2 : selectedPortraitIndex;
      setSelectedPortraitIndex(Math.max(0, newIndex));
      setSelectedOutfitIndex(null);
      return {
        ...prev,
        portraits: prev.portraits.filter((_, i) => i !== index)
      };
    });
  };


  // --- Outfit Handlers (now relative to current portrait) ---
  const handleOutfitChange = (outfitId: string, field: 'arcName', value: string) => {
    setEditedCharacter(prev => ({
        ...prev,
        portraits: prev.portraits.map((p, pIndex) => 
          pIndex === selectedPortraitIndex
            ? { ...p, outfits: p.outfits.map(o => o.id === outfitId ? { ...o, [field]: value } : o) }
            : p
        )
    }));
  };
  
  const handleOutfitImageChange = async (outfitId: string, file: File) => {
    try {
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.8 });
        setEditedCharacter(prev => ({
            ...prev,
            portraits: prev.portraits.map((p, pIndex) =>
              pIndex === selectedPortraitIndex
                ? { ...p, outfits: p.outfits.map(o => o.id === outfitId ? { ...o, imageUrl: imageKey } : o) }
                : p
            )
        }));
    } catch (error) {
        console.error("Error processing outfit image:", error);
    }
  };

  const handleAddOutfit = () => {
      const newOutfit: Outfit = {
          id: crypto.randomUUID(),
          arcName: t('characterCard.newArcName'),
          imageUrl: '',
      };
      setEditedCharacter(prev => ({
          ...prev,
          portraits: prev.portraits.map((p, pIndex) =>
            pIndex === selectedPortraitIndex
              ? { ...p, outfits: [...p.outfits, newOutfit] }
              : p
          )
      }));
  };
  
  const handleDeleteOutfit = (outfitId: string) => {
      if (!currentPortrait || currentPortrait.outfits.length <= 1) {
          alert(t('characterCard.atLeastOneOutfit'));
          return;
      }
      setEditedCharacter(prev => {
        const portraitToUpdate = prev.portraits[selectedPortraitIndex];
        const outfitIndexToDelete = portraitToUpdate.outfits.findIndex(o => o.id === outfitId);
        
        let newSelectedOutfitIndex = selectedOutfitIndex;
        if (selectedOutfitIndex === outfitIndexToDelete) {
            newSelectedOutfitIndex = null; // Deselect if deleting the active one
        } else if (selectedOutfitIndex !== null && selectedOutfitIndex > outfitIndexToDelete) {
            newSelectedOutfitIndex = selectedOutfitIndex - 1; // Adjust index down
        }
        setSelectedOutfitIndex(newSelectedOutfitIndex);

        return {
            ...prev,
            portraits: prev.portraits.map((p, pIndex) =>
              pIndex === selectedPortraitIndex
                ? { ...p, outfits: p.outfits.filter(o => o.id !== outfitId) }
                : p
            )
        };
      });
  };

  // --- Gallery Handlers ---
  const handleAddGalleryImage = () => {
    const newImage: GalleryImage = {
        id: crypto.randomUUID(),
        caption: t('characterCard.newPortraitName'),
        imageUrl: '',
    };
    setEditedCharacter(prev => ({
        ...prev,
        gallery: [...(prev.gallery || []), newImage]
    }));
  };

  const handleDeleteGalleryImage = (id: string) => {
    setEditedCharacter(prev => ({
        ...prev,
        gallery: prev.gallery.filter(img => img.id !== id)
    }));
  };

  const handleGalleryImageChange = async (id: string, file: File) => {
    try {
        const imageKey = await apiService.processAndStoreImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
        setEditedCharacter(prev => ({
            ...prev,
            gallery: prev.gallery.map(img => img.id === id ? { ...img, imageUrl: imageKey } : img)
        }));
    } catch (error) {
        console.error("Error processing gallery image:", error);
    }
  };

  const handleGalleryCaptionChange = (id: string, caption: string) => {
    setEditedCharacter(prev => ({
        ...prev,
        gallery: prev.gallery.map(img => img.id === id ? { ...img, caption } : img)
    }));
  };

  const handleSave = () => {
    onUpdate(editedCharacter);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditedCharacter(character);
    setIsEditing(false);
  };

  const backgroundStyle = resolvedBgUrl
    ? {
        backgroundImage: `
            linear-gradient(to right, rgba(15, 23, 42, 1) 35%, rgba(15, 23, 42, 0.8) 60%, rgba(15, 23, 42, 0.5) 100%),
            url(${resolvedBgUrl})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundColor: '#1E293B', // secondary
      };
    
    const dossierSections: { id: string; label: string; name: keyof Character | 'appearance' | 'stats' | 'gallery' }[] = [
        { id: 'about', label: t('characterCard.about'), name: 'about' },
        { id: 'biography', label: t('characterCard.biography'), name: 'biography' },
        { id: 'personality', label: t('characterCard.personality'), name: 'personality' },
        { id: 'appearance', label: t('characterCard.appearance'), name: 'appearanceDescription' },
        { id: 'powers', label: t('characterCard.powers'), name: 'powers' },
        { id: 'relationships', label: t('characterCard.relationships'), name: 'relationships' },
        { id: 'stats', label: t('characterCard.stats'), name: 'stats' },
        { id: 'trivia', label: t('characterCard.trivia'), name: 'trivia' },
        { id: 'gallery', label: t('characterCard.gallery'), name: 'gallery' }
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        const container = dossierContainerRef.current;
        if (element && container) {
            container.scrollTo({
                top: element.offsetTop - 16, // 16px offset for padding
                behavior: 'smooth',
            });
        }
    };

  if (!character || !editedCharacter) return null;
  const canEdit = userRole === 'admin';

  return (
    <>
      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}
      <div 
        className="rounded-xl shadow-lg flex flex-col md:flex-row gap-6 p-6 transition-all duration-300 ease-in-out relative overflow-hidden"
        style={backgroundStyle}
      >
        {canEdit && <input type="file" ref={backgroundFileInputRef} onChange={handleBackgroundFileChange} accept="image/*" className="hidden"/>}
        
        {/* --- GLOBAL ACTION BUTTONS --- */}
        {canEdit && (
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                {isEditing ? (
                    <>
                        <button onClick={handleSave} className="bg-accent hover:bg-sky-500 text-white font-bold py-1 px-3 rounded-md transition-colors text-sm">{t('characterCard.save')}</button>
                        <button onClick={handleCancel} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-1 px-3 rounded-md transition-colors text-sm">{t('characterCard.cancel')}</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => backgroundFileInputRef.current?.click()} className="bg-secondary/50 hover:bg-secondary text-text-primary p-2 rounded-full transition-colors backdrop-blur-sm" title={t('characterCard.editBackground')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => setIsEditing(true)} className="bg-secondary/50 hover:bg-secondary text-text-primary p-2 rounded-full transition-colors backdrop-blur-sm" title={t('characterCard.editDetails')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => onDelete(character.id)} className="bg-red-900/50 hover:bg-red-800 text-red-100 p-2 rounded-full transition-colors backdrop-blur-sm" title={t('characterCard.deleteCharacter')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                    </>
                )}
            </div>
        )}

        {/* --- LEFT PANEL: ID CARD --- */}
        <div className="flex-shrink-0 w-full md:w-1/3 space-y-4">
            {/* --- OUTFIT IMAGE --- */}
            <div className="relative w-full aspect-square max-w-sm mx-auto rounded-xl border-4 border-secondary/75 shadow-lg object-cover overflow-hidden bg-primary group">
                <div onClick={() => !isEditing && displayedImageUrl && setModalImage({ src: displayedImageUrl, alt: displayedImageAlt })} className={`${!isEditing && displayedImageUrl ? 'cursor-pointer' : ''}`}>
                    {displayedImageUrl ? (
                        <img src={displayedImageUrl} alt={displayedImageAlt} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg></div>
                    )}
                </div>
            </div>
            
            {/* --- PORTRAIT & OUTFIT SELECTORS --- */}
             <div className="flex flex-col items-center gap-3">
                 <div className="w-full text-center">
                    <div className="text-3xl font-bold text-white break-words font-display flex items-center justify-center gap-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {isEditing ? (
                            <input type="text" name="name" value={editedCharacter.name} onChange={handleInputChange} className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition text-center text-3xl font-display" />
                        ) : (
                            <>
                                <h3>{editedCharacter.name}</h3>
                                {editedCharacter.isNpc && (
                                    <span className="bg-gray-700/80 text-white text-xs px-2 py-1 rounded border border-gray-500 font-sans tracking-wide align-middle" title={t('characterCard.isNpc')}>
                                        {t('characterCard.isNpc')}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    <div className="mt-1 min-h-8"> {/* Fixed height to prevent layout shift when editing */}
                        {isEditing ? (
                            <div className="space-y-2">
                                <input 
                                    type="text" 
                                    name="alias" 
                                    value={editedCharacter.alias || ''} 
                                    onChange={handleInputChange} 
                                    placeholder={t('characterCard.placeholders.alias')}
                                    className="w-full bg-secondary/70 border border-secondary rounded-md p-1.5 text-text-primary focus:ring-accent focus:border-accent transition text-center text-lg placeholder:text-slate-500" 
                                />
                                <label className="flex items-center justify-center gap-2 text-sm text-text-secondary cursor-pointer bg-secondary/40 p-1 rounded hover:bg-secondary/60 transition">
                                    <input 
                                        type="checkbox" 
                                        name="isNpc" 
                                        checked={!!editedCharacter.isNpc} 
                                        onChange={handleCheckboxChange}
                                        className="rounded border-gray-500 text-accent focus:ring-accent"
                                    />
                                    {t('characterCard.markAsNpc')}
                                </label>
                            </div>
                        ) : (
                            editedCharacter.alias && <p className="text-lg text-accent/90 font-display tracking-wider">"{editedCharacter.alias}"</p>
                        )}
                    </div>
                </div>
                 <div className="w-full p-3 bg-primary/60 rounded-lg space-y-2">
                    <h4 className="text-center font-semibold text-accent/80 text-sm uppercase tracking-wider">{t('characterCard.portrait')}</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                        {editedCharacter.portraits.map((portrait, index) => (
                             <button
                                key={portrait.id}
                                onClick={() => { setSelectedPortraitIndex(index); setSelectedOutfitIndex(null); }}
                                aria-label={`Switch to ${portrait.name} portrait`}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                    selectedPortraitIndex === index 
                                        ? 'bg-accent text-white shadow-md' 
                                        : 'bg-secondary/70 text-text-secondary hover:bg-secondary hover:text-text-primary'
                                }`}
                            >
                                {portrait.name}
                            </button>
                        ))}
                    </div>
                </div>

                {currentPortrait && (
                     <div className="w-full p-3 bg-primary/60 rounded-lg space-y-2">
                        <h4 className="text-center font-semibold text-accent/80 text-sm uppercase tracking-wider">{t('characterCard.outfit')}</h4>
                        <div className="flex flex-wrap justify-center gap-2">
                            {currentPortrait.outfits.map((outfit, index) => (
                                <button
                                    key={outfit.id}
                                    onClick={() => setSelectedOutfitIndex(prev => prev === index ? null : index)}
                                    aria-label={`Switch to ${outfit.arcName} outfit`}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                        selectedOutfitIndex === index 
                                            ? 'bg-accent text-white shadow-md' 
                                            : 'bg-secondary/70 text-text-secondary hover:bg-secondary hover:text-text-primary'
                                    }`}
                                >
                                    {outfit.arcName}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- EDITING UI FOR PORTRAITS & OUTFITS --- */}
            {isEditing && (
                <div className="space-y-4">
                    {/* Portrait Editor */}
                    <div className="space-y-3 p-3 bg-primary/60 rounded-lg max-h-60 overflow-y-auto">
                        <h4 className="text-lg font-semibold text-accent mb-2 text-center">{t('characterCard.editPortraits')}</h4>
                        {editedCharacter.portraits.map((portrait, index) => {
                            const fileInputId = `portrait-file-${portrait.id}`;
                            return (
                                <div key={portrait.id} className="flex items-center gap-3 bg-secondary/50 p-2 rounded-lg">
                                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-primary flex-shrink-0 group">
                                        <input type="file" id={fileInputId} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePortraitImageChange(index, e.target.files[0])}/>
                                        <ResolvedImageDisplay imageKey={portrait.imageUrl} alt={portrait.name} defaultIconSize="h-6 w-6" />
                                        <label htmlFor={fileInputId} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity cursor-pointer">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </label>
                                    </div>
                                    <div className="flex-grow">
                                        <label className="text-xs text-text-secondary">{t('characterCard.portraitName')}</label>
                                        <input type="text" value={portrait.name} onChange={(e) => handlePortraitChange(index, 'name', e.target.value)} className="w-full bg-secondary/70 border border-secondary rounded-md p-1.5 text-sm text-text-primary focus:ring-accent focus:border-accent transition"/>
                                    </div>
                                    <button onClick={() => handleDeletePortrait(index)} className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors self-end">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            )
                        })}
                        <button onClick={handleAddPortrait} className="w-full bg-accent/20 text-accent font-semibold hover:bg-accent/40 py-2 rounded-lg transition-colors mt-2">
                            {t('characterCard.addPortrait')}
                        </button>
                    </div>

                    {/* Outfit Editor for selected portrait */}
                    {currentPortrait && (
                       <div className="space-y-3 p-3 bg-primary/60 rounded-lg max-h-60 overflow-y-auto">
                        <h4 className="text-lg font-semibold text-accent mb-2 text-center">{t('characterCard.editOutfitsFor', { portraitName: currentPortrait.name })}</h4>
                        {currentPortrait.outfits.map((outfit) => {
                            const fileInputId = `outfit-file-${outfit.id}`;
                            return (
                                <div key={outfit.id} className="flex items-center gap-3 bg-secondary/50 p-2 rounded-lg">
                                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-primary flex-shrink-0 group">
                                        <input type="file" id={fileInputId} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleOutfitImageChange(outfit.id, e.target.files[0])}/>
                                        <ResolvedImageDisplay imageKey={outfit.imageUrl} alt={outfit.arcName} defaultIconSize="h-6 w-6" />
                                        <label htmlFor={fileInputId} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity cursor-pointer">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </label>
                                    </div>
                                    <div className="flex-grow">
                                        <label className="text-xs text-text-secondary">{t('characterCard.arcName')}</label>
                                        <input type="text" value={outfit.arcName} onChange={(e) => handleOutfitChange(outfit.id, 'arcName', e.target.value)} className="w-full bg-secondary/70 border border-secondary rounded-md p-1.5 text-sm text-text-primary focus:ring-accent focus:border-accent transition"/>
                                    </div>
                                    <button onClick={() => handleDeleteOutfit(outfit.id)} className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors self-end">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            )
                        })}
                        <button onClick={handleAddOutfit} className="w-full bg-accent/20 text-accent font-semibold hover:bg-accent/40 py-2 rounded-lg transition-colors mt-2">
                            {t('characterCard.addOutfit')}
                        </button>
                    </div>
                    )}
                </div>
            )}
        </div>
        
        {/* --- RIGHT PANEL: DOSSIER --- */}
        <div className="flex-1 w-full md:w-2/3 flex flex-col">
            <div className="border-b border-secondary/50 flex flex-wrap -mb-px">
                {dossierSections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(`dossier-${section.id}`)}
                        className="px-3 py-2 text-sm font-semibold text-text-secondary hover:text-white border-b-2 border-transparent hover:border-accent transition-colors focus:outline-none focus:text-white focus:border-accent"
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            <div ref={dossierContainerRef} className="bg-primary/50 backdrop-blur-sm p-4 rounded-b-lg overflow-y-auto flex-grow h-[65vh] md:h-auto scroll-pt-4">
                <section id="dossier-about" className="mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                        <EditableInfoBlock title={t('characterCard.status')} content={editedCharacter.status} name="status" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title={t('characterCard.birthplace')} content={editedCharacter.birthplace} name="birthplace" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title={t('characterCard.age')} content={editedCharacter.age} name="age" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title={t('characterCard.height')} content={editedCharacter.height} name="height" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title={t('characterCard.weight')} content={editedCharacter.weight} name="weight" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title={t('characterCard.bloodType')} content={editedCharacter.bloodType} name="bloodType" isEditing={isEditing} onChange={handleInputChange}/>
                    </div>
                    {isEditing && (
                         <div className="p-3 rounded-lg bg-primary/60">
                            <label className="font-semibold text-accent/80 text-sm uppercase tracking-wider mb-1 block">{t('characterCard.associatedArcs')}</label>
                             <input
                                type="text"
                                name="arcs"
                                value={(editedCharacter.arcs || []).join(', ')}
                                onChange={handleInputChange}
                                className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"
                                placeholder={t('characterCard.arcsPlaceholder')}
                            />
                            <p className="text-xs text-text-secondary mt-1">{t('characterCard.arcsHelpText')}</p>
                        </div>
                    )}
                    <SimpleEditableSection title={t('characterCard.about')} content={editedCharacter.about} name="about" isEditing={isEditing} onChange={handleInputChange}/>
                </section>
                <section id="dossier-biography" className="mb-8"><SimpleEditableSection title={t('characterCard.biography')} content={editedCharacter.biography} name="biography" isEditing={isEditing} onChange={handleInputChange}/></section>
                <section id="dossier-personality" className="mb-8"><SimpleEditableSection title={t('characterCard.personality')} content={editedCharacter.personality} name="personality" isEditing={isEditing} onChange={handleInputChange}/></section>
                <section id="dossier-appearance" className="mb-8"><SimpleEditableSection title={t('characterCard.appearance')} content={editedCharacter.appearanceDescription} name="appearanceDescription" isEditing={isEditing} onChange={handleInputChange}/></section>
                <section id="dossier-powers" className="mb-8"><SimpleEditableSection title={t('characterCard.powers')} content={editedCharacter.powers} name="powers" isEditing={isEditing} onChange={handleInputChange}/></section>
                <section id="dossier-relationships" className="mb-8"><SimpleEditableSection title={t('characterCard.relationships')} content={editedCharacter.relationships} name="relationships" isEditing={isEditing} onChange={handleInputChange}/></section>
                
                <section id="dossier-stats" className="mb-8">
                    <h3 className="text-2xl font-bold text-accent mb-3 border-b-2 border-accent/30 pb-2 font-display">{t('characterCard.stats')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {STAT_KEYS.map(key => (
                            <div key={key} className="bg-primary/60 backdrop-blur-sm p-3 rounded-lg text-center">
                                <h4 className="font-semibold text-accent/80 text-sm uppercase tracking-wider mb-1">{t(`characterCard.statsShort.${key}`)}</h4>
                                {isEditing ? (
                                    <input type="number" name={key} value={editedCharacter.stats[key]} onChange={handleStatChange} className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition text-center"/>
                                ) : (
                                    <p className="text-text-primary text-xl font-bold">{editedCharacter.stats[key]}</p>
                                )}
                            </div>
                        ))}
                    </div>
                     {!isEditing && (
                        <>
                            <div className="flex gap-2 justify-end my-4">
                                <button onClick={() => setChartType(p => p === 'radar' ? null : 'radar')} className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${chartType === 'radar' ? 'bg-accent text-white shadow-lg' : 'bg-primary hover:bg-slate-700 text-text-primary'}`}>{t('characterCard.radar')}</button>
                                <button onClick={() => setChartType(p => p === 'bar' ? null : 'bar')} className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${chartType === 'bar' ? 'bg-accent text-white shadow-lg' : 'bg-primary hover:bg-slate-700 text-text-primary'}`}>{t('characterCard.bar')}</button>
                            </div>
                            <div className={`grid transition-all duration-500 ease-in-out ${chartType ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden min-h-0">
                                    {chartType === 'radar' && <RadarChart stats={character.stats} size={300} />}
                                    {chartType === 'bar' && <BarChart stats={character.stats} width={450} height={300} />}
                                </div>
                            </div>
                        </>
                    )}
                </section>
                 <section id="dossier-trivia" className="mb-8"><SimpleEditableSection title={t('characterCard.trivia')} content={editedCharacter.trivia} name="trivia" isEditing={isEditing} onChange={handleInputChange}/></section>
                 <section id="dossier-gallery">
                    <h3 className="text-2xl font-bold text-accent mb-3 border-b-2 border-accent/30 pb-2 font-display">{t('characterCard.gallery')}</h3>
                     {isEditing ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                           {(editedCharacter.gallery || []).map((image) => {
                               const fileInputId = `gallery-file-${image.id}`;
                               return (
                                   <div key={image.id} className="flex items-center gap-4 bg-secondary/50 p-3 rounded-lg">
                                       <div className="relative w-16 h-16 rounded-md overflow-hidden bg-primary flex-shrink-0 group">
                                           <input type="file" id={fileInputId} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleGalleryImageChange(image.id, e.target.files[0])}/>
                                            <ResolvedImageDisplay imageKey={image.imageUrl} alt={image.caption} defaultIconSize="h-8 w-8" />
                                           <label htmlFor={fileInputId} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity cursor-pointer">
                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                           </label>
                                       </div>
                                       <div className="flex-grow">
                                           <label className="text-xs text-text-secondary">{t('characterCard.caption')}</label>
                                           <input type="text" value={image.caption} onChange={(e) => handleGalleryCaptionChange(image.id, e.target.value)} className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"/>
                                       </div>
                                       <button onClick={() => handleDeleteGalleryImage(image.id)} className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                       </button>
                                   </div>
                               )
                           })}
                           <button onClick={handleAddGalleryImage} className="w-full bg-accent/20 text-accent font-semibold hover:bg-accent/40 py-2 rounded-lg transition-colors">
                               {t('characterCard.addGalleryImage')}
                           </button>
                       </div>
                    ) : (
                        (editedCharacter.gallery && editedCharacter.gallery.length > 0) ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {editedCharacter.gallery.filter(img => img.imageUrl).map(image => (
                                    <GalleryImageItem key={image.id} image={image} characterName={character.name} onImageClick={setModalImage} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-secondary italic">{t('characterCard.noGalleryImages')}</p>
                        )
                    )}
                </section>
            </div>
        </div>
      </div>
    </>
  );
};


const ResolvedImageDisplay: React.FC<{imageKey?: string, alt: string, defaultIconSize: string}> = ({ imageKey, alt, defaultIconSize }) => {
    const resolvedUrl = useResolvedImageUrl(imageKey);
    if (resolvedUrl) {
        return <img src={resolvedUrl} alt={alt} className="w-full h-full object-cover"/>
    }
    return (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className={defaultIconSize} viewBox="http://www.w3.org/2000/svg" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
        </div>
    );
};

const GalleryImageItem: React.FC<{image: GalleryImage, characterName: string, onImageClick: (img: {src: string, alt: string}) => void}> = ({ image, characterName, onImageClick }) => {
    const resolvedUrl = useResolvedImageUrl(image.imageUrl);
    return (
        <div 
            className="relative aspect-square group rounded-lg overflow-hidden border-2 border-secondary/50 hover:border-accent transition-colors cursor-pointer"
            onClick={() => resolvedUrl && onImageClick({src: resolvedUrl, alt: `${characterName} - ${image.caption}`})}
        >
            <ResolvedImageDisplay imageKey={image.imageUrl} alt={image.caption} defaultIconSize="h-10 w-10" />
            <div className="absolute bottom-0 left-0 w-full p-2 bg-black/60 backdrop-blur-sm text-center">
                <p className="text-white font-semibold truncate text-sm">{image.caption}</p>
            </div>
        </div>
    );
};


export default CharacterCard;