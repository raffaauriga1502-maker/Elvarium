import React, { useRef, useState, useEffect } from 'react';
import { Character, Appearance, GalleryImage, User } from '../types';
import RadarChart from './RadarChart';
import BarChart from './BarChart';
import ImageModal from './ImageModal';
import { generateCharacterDetail, generateCharacterImage } from '../services/geminiService';


interface CharacterCardProps {
  character: Character;
  onBackgroundUpload: (base64Url: string) => void;
  onUpdate: (character: Character) => void;
  onDelete: (id: string) => void;
  userRole: User['role'];
}

const STAT_KEYS: (keyof Character['stats'])[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
});

const EditableInfoBlock: React.FC<{ 
    title: string; 
    content: string; 
    isEditing: boolean;
    name: keyof Pick<Character, 'birthplace' | 'age' | 'height' | 'weight' | 'bloodType' | 'status'>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}> = ({ title, content, isEditing, name, onChange }) => {
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
                        <option value="Alive">Alive</option>
                        <option value="Deceased">Deceased</option>
                        <option value="Unknown">Unknown</option>
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
                <p className={`text-text-primary whitespace-pre-wrap min-h-[1.5rem] ${content === 'Deceased' ? 'text-red-400 font-semibold' : ''}`}>{content}</p>
            )}
        </div>
    );
};

const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 3zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM4.134 5.866a.75.75 0 011.06 0l1.061 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM13.745 14.806a.75.75 0 011.06 0l1.061 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM5.866 13.745a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM14.806 4.134a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM3 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 10zm12 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0115 10zM10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" clipRule="evenodd" />
    </svg>
);

const EditableSection: React.FC<{ 
    title: string; 
    content: string; 
    isEditing: boolean;
    name: keyof Pick<Character, 'about' | 'biography' | 'personality' | 'appearanceDescription' | 'powers' | 'relationships' | 'trivia'>;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onGenerate: () => void;
    isGenerating: boolean;
}> = ({ title, content, isEditing, name, onChange, onGenerate, isGenerating }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-3 border-b-2 border-accent/30 pb-2">
                <h3 className="text-2xl font-bold text-accent" style={{ fontFamily: "'Cinzel Decorative', serif" }}>{title}</h3>
                {isEditing && (
                    <button 
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-md transition-colors bg-accent/20 text-accent hover:bg-accent/40 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                        aria-label={`Generate ${title} with AI`}
                    >
                        {isGenerating ? (
                           <>
                             <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             Generating...
                           </>
                        ) : (
                            <>
                                <SparkleIcon className="h-4 w-4" />
                                Generate
                            </>
                        )}
                    </button>
                )}
            </div>
            {isEditing ? (
                 <textarea
                    name={name}
                    value={content}
                    onChange={onChange}
                    rows={10}
                    className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"
                    placeholder={isGenerating ? 'AI is generating content...' : 'Enter details here...'}
                />
            ) : (
                <div className="prose prose-invert max-w-none prose-p:text-text-primary whitespace-pre-wrap">
                    {content ? content.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p className="text-text-secondary">No information provided.</p>}
                </div>
            )}
        </div>
    );
};


const CharacterCard: React.FC<CharacterCardProps> = ({ character, onBackgroundUpload, onUpdate, onDelete, userRole }) => {
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const dossierContainerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCharacter, setEditedCharacter] = useState<Character>(character);
  const [chartType, setChartType] = useState<'radar' | 'bar' | null>(null);
  const [modalImage, setModalImage] = useState<{src: string, alt: string} | null>(null);
  const [selectedAppearanceIndex, setSelectedAppearanceIndex] = useState(0);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);


  useEffect(() => {
    setEditedCharacter(character);
    setChartType(null);
    setSelectedAppearanceIndex(0);

    if (character.name === 'New Character' && userRole === 'admin') {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [character, userRole]);

  const mainAppearance = editedCharacter.appearances?.[selectedAppearanceIndex];

  const handleBackgroundFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64Url = await fileToBase64(file);
      onBackgroundUpload(base64Url);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedCharacter(prev => ({ ...prev, [name]: value }));
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
  
  const handleAppearanceChange = (id: string, field: 'arcName', value: string) => {
    setEditedCharacter(prev => ({
        ...prev,
        appearances: prev.appearances.map(app => app.id === id ? { ...app, [field]: value } : app)
    }));
  };
  
  const handleAppearanceImageChange = async (id: string, file: File) => {
    const newUrl = await fileToBase64(file);
    setEditedCharacter(prev => {
        return {
            ...prev,
            appearances: prev.appearances.map(app => app.id === id ? { ...app, imageUrl: newUrl } : app)
        };
    });
  };

  const handleAddAppearance = () => {
      const newAppearance: Appearance = {
          id: crypto.randomUUID(),
          arcName: 'New Arc',
          imageUrl: '',
      };
      setEditedCharacter(prev => ({
          ...prev,
          appearances: [...prev.appearances, newAppearance]
      }));
  };
  
  const handleDeleteAppearance = (id: string) => {
      if (editedCharacter.appearances.length <= 1) {
          alert("A character must have at least one appearance.");
          return;
      }
      setEditedCharacter(prev => {
        const newIndex = selectedAppearanceIndex >= prev.appearances.length - 1 ? prev.appearances.length - 2 : selectedAppearanceIndex;
        setSelectedAppearanceIndex(Math.max(0, newIndex));
        return {
            ...prev,
            appearances: prev.appearances.filter(app => app.id !== id)
        };
      });
  };

  const handleAddGalleryImage = () => {
    const newImage: GalleryImage = {
        id: crypto.randomUUID(),
        caption: 'New Image',
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
    const newUrl = await fileToBase64(file);
    setEditedCharacter(prev => {
        return {
            ...prev,
            gallery: prev.gallery.map(img => img.id === id ? { ...img, imageUrl: newUrl } : img)
        };
    });
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
  
  const handleGenerateDetail = async (
    sectionName: keyof Pick<Character, 'about' | 'biography' | 'personality' | 'appearanceDescription' | 'powers' | 'relationships' | 'trivia'>
  ) => {
      setGeneratingSection(sectionName);
      try {
          const generatedText = await generateCharacterDetail(editedCharacter, sectionName);
          setEditedCharacter(prev => ({
              ...prev,
              [sectionName]: generatedText,
          }));
      } catch (error) {
          console.error(`Failed to generate ${sectionName}`, error);
      } finally {
          setGeneratingSection(null);
      }
  };

  const handleGenerateImage = async () => {
    if (!mainAppearance) return;
    setIsGeneratingImage(true);
    try {
        const base64Data = await generateCharacterImage(editedCharacter);
        const imageUrl = `data:image/png;base64,${base64Data}`;

        setEditedCharacter(prev => {
            const currentAppearance = prev.appearances[selectedAppearanceIndex];
            return {
                ...prev,
                appearances: prev.appearances.map((app, index) => 
                    index === selectedAppearanceIndex ? { ...app, imageUrl } : app
                )
            };
        });
    } catch (error) {
        console.error("Image generation failed", error);
        alert("Sorry, the AI couldn't generate an image. Please try again or check the console for errors.");
    } finally {
        setIsGeneratingImage(false);
    }
  };


  const backgroundStyle = editedCharacter.backgroundImageUrl
    ? {
        backgroundImage: `
            linear-gradient(to right, rgba(15, 23, 42, 1) 35%, rgba(15, 23, 42, 0.8) 60%, rgba(15, 23, 42, 0.5) 100%),
            url(${editedCharacter.backgroundImageUrl})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundColor: '#1E293B', // secondary
      };
    
    const dossierSections: { id: string; label: string; name: keyof Character | 'appearance' | 'stats' | 'gallery' }[] = [
        { id: 'about', label: 'About', name: 'about' },
        { id: 'biography', label: 'Biography', name: 'biography' },
        { id: 'personality', label: 'Personality', name: 'personality' },
        { id: 'appearance', label: 'Appearance', name: 'appearance' },
        { id: 'powers', label: 'Powers & Abilities', name: 'powers' },
        { id: 'relationships', label: 'Relationships', name: 'relationships' },
        { id: 'stats', label: 'Stats', name: 'stats' },
        { id: 'trivia', label: 'Trivia', name: 'trivia' },
        { id: 'gallery', label: 'Gallery', name: 'gallery' }
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
                        <button onClick={handleSave} className="bg-accent hover:bg-sky-500 text-white font-bold py-1 px-3 rounded-md transition-colors text-sm">Save</button>
                        <button onClick={handleCancel} className="bg-secondary hover:bg-slate-600 text-text-primary font-bold py-1 px-3 rounded-md transition-colors text-sm">Cancel</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => backgroundFileInputRef.current?.click()} className="bg-secondary/50 hover:bg-secondary text-text-primary p-2 rounded-full transition-colors backdrop-blur-sm" title="Edit Background">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => setIsEditing(true)} className="bg-secondary/50 hover:bg-secondary text-text-primary p-2 rounded-full transition-colors backdrop-blur-sm" title="Edit Details">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => onDelete(character.id)} className="bg-red-900/50 hover:bg-red-800 text-red-100 p-2 rounded-full transition-colors backdrop-blur-sm" title="Delete Character">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                    </>
                )}
            </div>
        )}

        {/* --- LEFT PANEL: ID CARD --- */}
        <div className="flex-shrink-0 w-full md:w-1/3 space-y-4">
            <div className="relative w-full aspect-square max-w-sm mx-auto rounded-xl border-4 border-secondary/75 shadow-lg object-cover overflow-hidden bg-primary group">
                <div onClick={() => !isEditing && mainAppearance?.imageUrl && setModalImage({ src: mainAppearance.imageUrl, alt: editedCharacter.name })} className={`${!isEditing && mainAppearance?.imageUrl ? 'cursor-pointer' : ''}`}>
                    {mainAppearance?.imageUrl ? (
                        <img src={mainAppearance.imageUrl} alt={editedCharacter.name} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg></div>
                    )}
                </div>
                 {isEditing && canEdit && (
                    <div className="absolute bottom-2 right-2 z-10">
                        <button 
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-accent/80 backdrop-blur-sm text-white hover:bg-accent disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg"
                            aria-label="Generate Character Portrait with AI"
                            title="Generate with AI"
                        >
                            {isGeneratingImage ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Generating...</span>
                            </>
                            ) : (
                                <>
                                    <SparkleIcon className="h-4 w-4" />
                                    <span>Generate</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
                {isGeneratingImage && (
                    <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center text-accent z-20">
                        <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-lg font-semibold text-white animate-pulse">Conjuring visual form...</p>
                    </div>
                )}
            </div>
            
            {!isEditing && editedCharacter.appearances.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 px-2">
                    {editedCharacter.appearances.map((appearance, index) => (
                        <button
                            key={appearance.id}
                            onClick={() => setSelectedAppearanceIndex(index)}
                            aria-label={`Switch to ${appearance.arcName} appearance`}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                selectedAppearanceIndex === index 
                                    ? 'bg-accent text-white shadow-md' 
                                    : 'bg-secondary/70 text-text-secondary hover:bg-secondary hover:text-text-primary'
                            }`}
                        >
                            {appearance.arcName}
                        </button>
                    ))}
                </div>
            )}
            
            {isEditing && (
                <div className="space-y-3 p-3 bg-primary/60 rounded-lg max-h-60 overflow-y-auto">
                    <h4 className="text-lg font-semibold text-accent mb-2 text-center">Edit Appearances</h4>
                    {editedCharacter.appearances.map((appearance) => {
                        const fileInputId = `appearance-file-${appearance.id}`;
                        return (
                             <div key={appearance.id} className="flex items-center gap-3 bg-secondary/50 p-2 rounded-lg">
                                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-primary flex-shrink-0 group">
                                    <input type="file" id={fileInputId} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAppearanceImageChange(appearance.id, e.target.files[0])}/>
                                    {appearance.imageUrl ? (<img src={appearance.imageUrl} alt={appearance.arcName} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg></div>)}
                                    <label htmlFor={fileInputId} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                    </label>
                                </div>
                                <div className="flex-grow">
                                    <label className="text-xs text-text-secondary">Arc Name</label>
                                    <input type="text" value={appearance.arcName} onChange={(e) => handleAppearanceChange(appearance.id, 'arcName', e.target.value)} className="w-full bg-secondary/70 border border-secondary rounded-md p-1.5 text-sm text-text-primary focus:ring-accent focus:border-accent transition"/>
                                </div>
                                <button onClick={() => handleDeleteAppearance(appearance.id)} className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors self-end">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        )
                    })}
                    <button onClick={handleAddAppearance} className="w-full bg-accent/20 text-accent font-semibold hover:bg-accent/40 py-2 rounded-lg transition-colors mt-2">
                        + Add Appearance
                    </button>
                </div>
            )}

            <div className="text-3xl font-bold text-white break-words text-center" style={{ fontFamily: "'Cinzel Decorative', serif", textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {isEditing ? (
                    <input type="text" name="name" value={editedCharacter.name} onChange={handleInputChange} className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition text-center text-3xl" style={{ fontFamily: "'Cinzel Decorative', serif"}} />
                ) : (<h3>{editedCharacter.name}</h3>)}
            </div>
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
                        <EditableInfoBlock title="Status" content={editedCharacter.status} name="status" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title="Birthplace" content={editedCharacter.birthplace} name="birthplace" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title="Age" content={editedCharacter.age} name="age" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title="Height" content={editedCharacter.height} name="height" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title="Weight" content={editedCharacter.weight} name="weight" isEditing={isEditing} onChange={handleInputChange}/>
                        <EditableInfoBlock title="Blood Type" content={editedCharacter.bloodType} name="bloodType" isEditing={isEditing} onChange={handleInputChange}/>
                    </div>
                    <EditableSection title="About" content={editedCharacter.about} name="about" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('about')} isGenerating={generatingSection === 'about'}/>
                </section>
                <section id="dossier-biography" className="mb-8"><EditableSection title="Biography" content={editedCharacter.biography} name="biography" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('biography')} isGenerating={generatingSection === 'biography'}/></section>
                <section id="dossier-personality" className="mb-8"><EditableSection title="Personality" content={editedCharacter.personality} name="personality" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('personality')} isGenerating={generatingSection === 'personality'}/></section>
                <section id="dossier-appearance" className="mb-8"><EditableSection title="Appearance" content={editedCharacter.appearanceDescription} name="appearanceDescription" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('appearanceDescription')} isGenerating={generatingSection === 'appearanceDescription'}/></section>
                <section id="dossier-powers" className="mb-8"><EditableSection title="Powers & Abilities" content={editedCharacter.powers} name="powers" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('powers')} isGenerating={generatingSection === 'powers'}/></section>
                <section id="dossier-relationships" className="mb-8"><EditableSection title="Relationships" content={editedCharacter.relationships} name="relationships" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('relationships')} isGenerating={generatingSection === 'relationships'}/></section>
                
                <section id="dossier-stats" className="mb-8">
                    <h3 className="text-2xl font-bold text-accent mb-3 border-b-2 border-accent/30 pb-2" style={{ fontFamily: "'Cinzel Decorative', serif" }}>Stats</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {STAT_KEYS.map(key => (
                            <div key={key} className="bg-primary/60 backdrop-blur-sm p-3 rounded-lg text-center">
                                <h4 className="font-semibold text-accent/80 text-sm uppercase tracking-wider mb-1">{key.slice(0,3)}</h4>
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
                                <button onClick={() => setChartType(p => p === 'radar' ? null : 'radar')} className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${chartType === 'radar' ? 'bg-accent text-white shadow-lg' : 'bg-primary hover:bg-slate-700 text-text-primary'}`}>Radar</button>
                                <button onClick={() => setChartType(p => p === 'bar' ? null : 'bar')} className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${chartType === 'bar' ? 'bg-accent text-white shadow-lg' : 'bg-primary hover:bg-slate-700 text-text-primary'}`}>Bar</button>
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
                 <section id="dossier-trivia" className="mb-8"><EditableSection title="Trivia" content={editedCharacter.trivia} name="trivia" isEditing={isEditing} onChange={handleInputChange} onGenerate={() => handleGenerateDetail('trivia')} isGenerating={generatingSection === 'trivia'}/></section>
                 <section id="dossier-gallery">
                    <h3 className="text-2xl font-bold text-accent mb-3 border-b-2 border-accent/30 pb-2" style={{ fontFamily: "'Cinzel Decorative', serif" }}>Gallery</h3>
                     {isEditing ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                           {(editedCharacter.gallery || []).map((image) => {
                               const fileInputId = `gallery-file-${image.id}`;
                               return (
                                   <div key={image.id} className="flex items-center gap-4 bg-secondary/50 p-3 rounded-lg">
                                       <div className="relative w-16 h-16 rounded-md overflow-hidden bg-primary flex-shrink-0 group">
                                           <input type="file" id={fileInputId} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleGalleryImageChange(image.id, e.target.files[0])}/>
                                           {image.imageUrl ? (<img src={image.imageUrl} alt={image.caption} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg></div>)}
                                           <label htmlFor={fileInputId} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity cursor-pointer">
                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                           </label>
                                       </div>
                                       <div className="flex-grow">
                                           <label className="text-xs text-text-secondary">Caption</label>
                                           <input type="text" value={image.caption} onChange={(e) => handleGalleryCaptionChange(image.id, e.target.value)} className="w-full bg-secondary/70 border border-secondary rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent transition"/>
                                       </div>
                                       <button onClick={() => handleDeleteGalleryImage(image.id)} className="p-2 rounded-full text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                       </button>
                                   </div>
                               )
                           })}
                           <button onClick={handleAddGalleryImage} className="w-full bg-accent/20 text-accent font-semibold hover:bg-accent/40 py-2 rounded-lg transition-colors">
                               + Add Gallery Image
                           </button>
                       </div>
                    ) : (
                        (editedCharacter.gallery && editedCharacter.gallery.length > 0) ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {editedCharacter.gallery.filter(img => img.imageUrl).map(image => (
                                    <div 
                                        key={image.id} 
                                        className="relative aspect-square group rounded-lg overflow-hidden border-2 border-secondary/50 hover:border-accent transition-colors cursor-pointer"
                                        onClick={() => image.imageUrl && setModalImage({src: image.imageUrl, alt: `${character.name} - ${image.caption}`})}
                                    >
                                        <img src={image.imageUrl} alt={image.caption} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 left-0 w-full p-2 bg-black/60 backdrop-blur-sm text-center">
                                            <p className="text-white font-semibold truncate text-sm">{image.caption}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-secondary italic">No images in the gallery yet.</p>
                        )
                    )}
                </section>
            </div>
        </div>
      </div>
    </>
  );
};

export default CharacterCard;