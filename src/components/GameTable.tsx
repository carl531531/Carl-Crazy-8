import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Card, GameState, Suit, Rank } from '../types';
import { createDeck, shuffleDeck, isPlayable } from '../utils/deck';
import PlayingCard from './PlayingCard';
import { Heart, Diamond, Club, Spade, RotateCcw, Info } from 'lucide-react';

const GameTable: React.FC = () => {
  const [state, setState] = useState<GameState>({
    playerHand: [],
    aiHand: [],
    drawPile: [],
    discardPile: [],
    currentSuit: 'hearts',
    currentRank: 'A',
    turn: 'player',
    status: 'waiting',
    winner: null,
    lastAction: '欢迎来到 Carl Crazy 8！',
  });

  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

  const initGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const playerHand = deck.splice(0, 8);
    const aiHand = deck.splice(0, 8);
    
    // Find a non-8 card for the start
    let firstCardIndex = deck.findIndex(c => c.rank !== '8');
    if (firstCardIndex === -1) firstCardIndex = 0;
    const firstCard = deck.splice(firstCardIndex, 1)[0];

    setState({
      playerHand,
      aiHand,
      drawPile: deck,
      discardPile: [firstCard],
      currentSuit: firstCard.suit,
      currentRank: firstCard.rank,
      turn: 'player',
      status: 'playing',
      winner: null,
      lastAction: '游戏开始！轮到你了。',
    });
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkWin = (hand: Card[], user: 'player' | 'ai') => {
    if (hand.length === 0) {
      setState(prev => ({
        ...prev,
        status: 'game_over',
        winner: user,
        lastAction: user === 'player' ? '你赢了！' : 'AI 赢了！',
      }));
      if (user === 'player') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      return true;
    }
    return false;
  };

  const playCard = (card: Card, isPlayer: boolean) => {
    if (card.rank === '8') {
      if (isPlayer) {
        setPendingWildCard(card);
        setShowSuitPicker(true);
        setState(prev => ({ ...prev, status: 'suit_selection' }));
      } else {
        // AI logic for 8
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        // AI picks suit it has most of
        const suitCounts = state.aiHand.reduce((acc, c) => {
          acc[c.suit] = (acc[c.suit] || 0) + 1;
          return acc;
        }, {} as Record<Suit, number>);
        const bestSuit = suits.reduce((a, b) => (suitCounts[a] || 0) > (suitCounts[b] || 0) ? a : b);
        
        const newAiHand = state.aiHand.filter(c => c.id !== card.id);
        const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
        setState(prev => ({
          ...prev,
          aiHand: newAiHand,
          discardPile: [card, ...prev.discardPile],
          currentSuit: bestSuit,
          currentRank: card.rank,
          turn: 'player',
          lastAction: `AI 打出了 8，并将花色改为 ${suitNames[bestSuit]}`,
        }));
        checkWin(newAiHand, 'ai');
      }
      return;
    }

    const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
    if (isPlayer) {
      const newHand = state.playerHand.filter(c => c.id !== card.id);
      setState(prev => ({
        ...prev,
        playerHand: newHand,
        discardPile: [card, ...prev.discardPile],
        currentSuit: card.suit,
        currentRank: card.rank,
        turn: 'ai',
        lastAction: `你打出了 ${suitNames[card.suit]} ${card.rank}`,
      }));
      checkWin(newHand, 'player');
    } else {
      const newHand = state.aiHand.filter(c => c.id !== card.id);
      setState(prev => ({
        ...prev,
        aiHand: newHand,
        discardPile: [card, ...prev.discardPile],
        currentSuit: card.suit,
        currentRank: card.rank,
        turn: 'player',
        lastAction: `AI 打出了 ${suitNames[card.suit]} ${card.rank}`,
      }));
      checkWin(newHand, 'ai');
    }
  };

  const drawCard = (isPlayer: boolean) => {
    if (state.drawPile.length === 0) {
      setState(prev => ({
        ...prev,
        turn: isPlayer ? 'ai' : 'player',
        lastAction: '摸牌堆已空！跳过回合。',
      }));
      return;
    }

    const newDrawPile = [...state.drawPile];
    const card = newDrawPile.pop()!;

    if (isPlayer) {
      setState(prev => ({
        ...prev,
        playerHand: [...prev.playerHand, card],
        drawPile: newDrawPile,
        turn: isPlayable(card, state.currentSuit, state.currentRank) ? 'player' : 'ai',
        lastAction: isPlayable(card, state.currentSuit, state.currentRank) 
          ? '你摸到了一张可以出的牌！' 
          : '你摸了一张牌。轮到 AI。',
      }));
    } else {
      setState(prev => ({
        ...prev,
        aiHand: [...prev.aiHand, card],
        drawPile: newDrawPile,
        turn: isPlayable(card, state.currentSuit, state.currentRank) ? 'ai' : 'player',
        lastAction: 'AI 摸了一张牌。',
      }));
    }
  };

  // AI Turn Logic
  useEffect(() => {
    if (state.turn === 'ai' && state.status === 'playing') {
      const timer = setTimeout(() => {
        const playableCards = state.aiHand.filter(c => isPlayable(c, state.currentSuit, state.currentRank));
        if (playableCards.length > 0) {
          // AI plays a card (prefers non-8 if possible, or random)
          const nonEight = playableCards.filter(c => c.rank !== '8');
          const cardToPlay = nonEight.length > 0 ? nonEight[Math.floor(Math.random() * nonEight.length)] : playableCards[0];
          playCard(cardToPlay, false);
        } else {
          drawCard(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.turn, state.status, state.aiHand, state.currentSuit, state.currentRank]);

  const handleSuitSelect = (suit: Suit) => {
    if (!pendingWildCard) return;
    
    const newHand = state.playerHand.filter(c => c.id !== pendingWildCard.id);
    const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
    setState(prev => ({
      ...prev,
      playerHand: newHand,
      discardPile: [pendingWildCard, ...prev.discardPile],
      currentSuit: suit,
      currentRank: pendingWildCard.rank,
      turn: 'ai',
      status: 'playing',
      lastAction: `你打出了 8，并将花色改为 ${suitNames[suit]}`,
    }));
    
    setShowSuitPicker(false);
    setPendingWildCard(null);
    checkWin(newHand, 'player');
  };

  const getSuitIcon = (suit: Suit) => {
    switch (suit) {
      case 'hearts': return <Heart className="w-6 h-6 text-red-500 fill-current" />;
      case 'diamonds': return <Diamond className="w-6 h-6 text-red-500 fill-current" />;
      case 'clubs': return <Club className="w-6 h-6 text-black fill-current" />;
      case 'spades': return <Spade className="w-6 h-6 text-black fill-current" />;
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-between p-4 bg-felt-light/40 overflow-hidden font-sans">
      {/* AI Hand */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-1 bg-black/30 rounded-full border border-white/10">
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">AI 对手</span>
          <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{state.aiHand.length} 张牌</span>
        </div>
        <div className="flex justify-center -space-x-12 sm:-space-x-16 h-32 sm:h-40">
          <AnimatePresence>
            {state.aiHand.map((card, i) => (
              <PlayingCard key={card.id} card={card} isFaceUp={false} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Center Board */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-8">
        <div className="flex items-center gap-8 sm:gap-16">
          {/* Draw Pile */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-white/5 rounded-lg blur-sm group-hover:bg-white/10 transition"></div>
            <div 
              onClick={() => state.turn === 'player' && state.status === 'playing' && drawCard(true)}
              className={`
                relative w-20 h-28 sm:w-24 sm:h-36 bg-blue-900 rounded-lg border-2 border-white/20 
                flex items-center justify-center cursor-pointer card-shadow
                ${state.turn === 'player' && state.status === 'playing' ? 'hover:scale-105 active:scale-95' : 'opacity-80 cursor-not-allowed'}
              `}
            >
              <div className="w-12 h-16 sm:w-16 sm:h-24 border border-white/10 rounded bg-white/5 flex items-center justify-center">
                <span className="text-white/20 text-2xl font-bold">{state.drawPile.length}</span>
              </div>
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-tighter text-white/40 font-bold">摸牌</div>
          </div>

          {/* Discard Pile */}
          <div className="relative">
             <div className="absolute -inset-1 bg-white/5 rounded-lg blur-sm"></div>
             <div className="relative w-20 h-28 sm:w-24 sm:h-36">
               <AnimatePresence mode="popLayout">
                 {state.discardPile.slice(0, 1).map((card) => (
                   <PlayingCard key={card.id} card={card} isFaceUp={true} className="absolute inset-0" />
                 ))}
               </AnimatePresence>
             </div>
             <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-tighter text-white/40 font-bold">弃牌</div>
          </div>
        </div>

        {/* Current Info */}
        <div className="flex flex-col items-center gap-2">
           <div className="flex items-center gap-3 px-6 py-2 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-white/50 font-bold">当前花色</span>
                <div className="bg-white p-1 rounded-md mt-1">
                  {getSuitIcon(state.currentSuit)}
                </div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-white/50 font-bold">当前点数</span>
                <span className="text-xl font-bold text-white mt-1">{state.currentRank}</span>
              </div>
           </div>
           <motion.div 
             key={state.lastAction}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-sm text-white/80 italic font-medium"
           >
             {state.lastAction}
           </motion.div>
        </div>
      </div>

      {/* Player Hand */}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1 bg-black/30 rounded-full border border-white/10">
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">你的手牌</span>
            <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">{state.playerHand.length} 张牌</span>
          </div>
          {state.turn === 'player' && state.status === 'playing' && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] font-bold text-yellow-400 uppercase animate-pulse"
            >
              轮到你了
            </motion.div>
          )}
        </div>
        <div className="flex justify-center -space-x-10 sm:-space-x-12 h-36 sm:h-44 pb-4 overflow-x-auto max-w-full px-12">
          <AnimatePresence>
            {state.playerHand.map((card, i) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                index={i}
                isPlayable={state.turn === 'player' && state.status === 'playing' && isPlayable(card, state.currentSuit, state.currentRank)}
                onClick={() => playCard(card, true)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {showSuitPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold mb-2">万能 8！</h2>
              <p className="text-white/60 mb-8">请选择一个新的花色继续游戏。</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => {
                  const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
                  return (
                    <button
                      key={suit}
                      onClick={() => handleSuitSelect(suit)}
                      className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                    >
                      <div className="p-3 bg-white rounded-xl group-hover:scale-110 transition">
                        {getSuitIcon(suit)}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-white/70">{suitNames[suit]}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {state.status === 'game_over' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl"
            >
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${state.winner === 'player' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {state.winner === 'player' ? <Info className="w-10 h-10" /> : <RotateCcw className="w-10 h-10" />}
              </div>
              
              <h2 className="text-4xl font-display font-black mb-2 uppercase tracking-tight">
                {state.winner === 'player' ? '胜利！' : '失败！'}
              </h2>
              <p className="text-white/60 mb-10 text-lg">
                {state.winner === 'player' ? '你率先清空了所有手牌。' : '这次 AI 的速度更快。'}
              </p>
              
              <button
                onClick={initGame}
                className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls / Info */}
      <div className="fixed top-4 right-4 flex gap-2">
         <button 
           onClick={initGame}
           className="p-2 bg-black/30 hover:bg-black/50 rounded-full border border-white/10 transition"
           title="重新开始"
         >
           <RotateCcw className="w-5 h-5 text-white/70" />
         </button>
      </div>
    </div>
  );
};

export default GameTable;
