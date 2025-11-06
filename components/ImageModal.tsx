import React from 'react';

interface ImageModalProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ src, alt, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] bg-secondary p-2 rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevents modal from closing when clicking on the image container
      >
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-contain max-h-[calc(90vh-1rem)]"
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-accent text-white rounded-full h-8 w-8 flex items-center justify-center text-xl font-bold hover:bg-sky-500 transition-colors"
          aria-label="Close image viewer"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default ImageModal;
