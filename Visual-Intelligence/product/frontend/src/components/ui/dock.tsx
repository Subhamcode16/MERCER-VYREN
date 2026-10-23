'use client';

import React, {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import { cn } from '@/lib/utils';

const DEFAULT_MAGNIFICATION = 50;
const DEFAULT_DISTANCE = 140;

type Orientation = 'horizontal' | 'vertical';

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  magnification?: number;
  spring?: SpringOptions;
  orientation?: Orientation;
  direction?: Orientation;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  label?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
};

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DockContextType = {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  spring: SpringOptions;
  magnification: number;
  distance: number;
  orientation: Orientation;
};

type DockProviderProps = {
  children: React.ReactNode;
  value: DockContextType;
};

const DockContext = createContext<DockContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 14 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  orientation = 'vertical',
  direction,
}: DockProps) {
  const actualOrientation = direction || orientation;
  const isVertical = actualOrientation === 'vertical';

  const mouseX = useMotionValue(Infinity);
  const mouseY = useMotionValue(Infinity);

  return (
    <div
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
      onMouseLeave={() => {
        mouseX.set(Infinity);
        mouseY.set(Infinity);
      }}
      className={cn(
        'relative flex bg-transparent border-none shadow-none select-none py-3 px-2',
        isVertical
          ? 'h-fit flex-col items-start justify-center gap-3'
          : 'w-fit flex-row items-end justify-center gap-3',
        className
      )}
      role="toolbar"
      aria-label="Application dock"
    >
      <DockProvider
        value={{
          mouseX,
          mouseY,
          spring,
          distance,
          magnification,
          orientation: actualOrientation,
        }}
      >
        {children}
      </DockProvider>
    </div>
  );
}

function DockItem({ children, className, label, onClick, onMouseEnter }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { distance, magnification, mouseX, mouseY, spring, orientation } = useDock();
  const isVertical = orientation === 'vertical';

  const isHovered = useMotionValue(0);
  const rectRef = useRef<{ y: number; height: number; x: number; width: number }>({
    y: 0,
    height: 40,
    x: 0,
    width: 40,
  });

  useEffect(() => {
    const updateRect = () => {
      if (ref.current) {
        const r = ref.current.getBoundingClientRect();
        rectRef.current = { y: r.top, height: r.height, x: r.left, width: r.width };
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true });
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, []);

  // Exact continuous distance calculation along active axis using cached rect
  const mouseDistance = useTransform(isVertical ? mouseY : mouseX, (val) => {
    const r = rectRef.current;
    if (isVertical) {
      return val - r.y - r.height / 2;
    }
    return val - r.x - r.width / 2;
  });

  const d1 = distance;
  const d2 = distance * 0.65;
  const d3 = distance * 0.32;

  // Scale transform (1.0 baseline -> 1.30 peak magnification wave)
  const maxScale = magnification / 40; // 1.30x
  const midHighScore = 1 + (maxScale - 1) * 0.55; // ~1.165x
  const midLowScore = 1 + (maxScale - 1) * 0.18; // ~1.054x

  const scaleTransform = useTransform(
    mouseDistance,
    [-d1, -d2, -d3, 0, d3, d2, d1],
    [1, midLowScore, midHighScore, maxScale, midHighScore, midLowScore, 1]
  );
  const scale = useSpring(scaleTransform, spring);

  // 18px peak outward bulge transform for side-view wave profile
  const peakBulge = 18;
  const midHighBulge = peakBulge * 0.55;
  const midLowBulge = peakBulge * 0.18;

  const xBulgeTransform = useTransform(
    mouseDistance,
    [-d1, -d2, -d3, 0, d3, d2, d1],
    [0, midLowBulge, midHighBulge, peakBulge, midHighBulge, midLowBulge, 0]
  );
  const x = useSpring(xBulgeTransform, spring);

  const yBulgeTransform = useTransform(
    mouseDistance,
    [-d1, -d2, -d3, 0, d3, d2, d1],
    [0, -midLowBulge, -midHighBulge, -peakBulge, -midHighBulge, -midLowBulge, 0]
  );
  const y = useSpring(yBulgeTransform, spring);

  return (
    <div
      className="relative w-10 h-10 flex items-center justify-center shrink-0"
      onMouseEnter={onMouseEnter}
    >
      <motion.div
        ref={ref}
        style={{
          width: 40,
          height: 40,
          scale,
          x: isVertical ? x : 0,
          y: isVertical ? 0 : y,
          transformOrigin: isVertical ? 'left center' : 'center bottom',
        }}
        onClick={onClick}
        onHoverStart={() => isHovered.set(1)}
        onHoverEnd={() => isHovered.set(0)}
        onFocus={() => {
          isHovered.set(1);
          onMouseEnter?.();
        }}
        onBlur={() => isHovered.set(0)}
        whileTap={{ scale: 0.92 }}
        className={cn(
          'relative inline-flex items-center justify-center cursor-pointer select-none rounded-full aspect-square transition-colors duration-150 will-change-transform shrink-0',
          className
        )}
        tabIndex={0}
        role="button"
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.();
          }
        }}
      >
        {Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            isHovered,
            orientation,
          });
        })}
      </motion.div>
    </div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const isHovered = restProps['isHovered'] as MotionValue<number> | undefined;
  const orientation = (restProps['orientation'] as Orientation) || 'vertical';
  const isVertical = orientation === 'vertical';

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={
            isVertical
              ? { opacity: 0, x: -8, scale: 0.92 }
              : { opacity: 0, y: 0, scale: 0.92 }
          }
          animate={
            isVertical
              ? { opacity: 1, x: 0, scale: 1 }
              : { opacity: 1, y: -10, scale: 1 }
          }
          exit={
            isVertical
              ? { opacity: 0, x: -6, scale: 0.92 }
              : { opacity: 0, y: 0, scale: 0.92 }
          }
          transition={{ type: 'spring', mass: 0.1, stiffness: 260, damping: 20 }}
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#0f1419] shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl',
            isVertical
              ? 'left-full ml-3 top-1/2 -translate-y-1/2'
              : '-top-8 left-1/2 -translate-x-1/2',
            className
          )}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const size = restProps['size'] as MotionValue<number> | undefined;

  const iconSize = useTransform(size || new MotionValue(40), (val) =>
    Math.max(18, val * 0.5)
  );

  return (
    <motion.div
      style={{
        width: iconSize,
        height: iconSize,
      }}
      className={cn('flex items-center justify-center shrink-0 text-slate-700 dark:text-neutral-200 pointer-events-none', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
