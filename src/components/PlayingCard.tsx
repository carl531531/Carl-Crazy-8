import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardType } from '../types';

interface PlayingCardProps {
  card: CardType;
  isFaceUp?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
  index?: number;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isFaceUp = true,
  onClick,
  isPlayable = false,
  className = '',
  index = 0,
}) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  return (
    <motion.div
      layoutId={card.id}
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -50 }}
      whileHover={isFaceUp && isPlayable ? { y: -20, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg cursor-pointer select-none
        perspective-1000 transition-shadow duration-200
        ${isFaceUp ? 'bg-white' : 'bg-blue-800'}
        ${isPlayable ? 'ring-4 ring-yellow-400 shadow-xl' : 'card-shadow'}
        ${className}
      `}
      style={{
        zIndex: index,
      }}
    >
      {isFaceUp ? (
        <div className={`w-full h-full p-2 flex flex-col justify-between ${isRed ? 'text-red-600' : 'text-black'}`}>
          <div className="flex flex-col items-start leading-none">
            <span className="text-lg sm:text-xl font-bold">{card.rank}</span>
            <span className="text-sm sm:text-base">{getSuitSymbol(card.suit)}</span>
          </div>
          
          <div className="flex justify-center items-center text-3xl sm:text-4xl">
            {getSuitSymbol(card.suit)}
          </div>
          
          <div className="flex flex-col items-end leading-none rotate-180">
            <span className="text-lg sm:text-xl font-bold">{card.rank}</span>
            <span className="text-sm sm:text-base">{getSuitSymbol(card.suit)}</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full rounded-lg border-4 border-white/20 flex items-center justify-center">
          <div className="w-12 h-16 sm:w-16 sm:h-24 border-2 border-white/10 rounded-md bg-white/5 flex items-center justify-center">
             <span className="text-white/20 text-4xl font-bold">8</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PlayingCard;
