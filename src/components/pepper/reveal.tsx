"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Primitivas de animação por scroll da Pepper.
 *
 * Tudo aqui respeita `prefers-reduced-motion`: quando o usuário pede menos
 * movimento, os componentes renderizam no estado final e nenhum
 * `whileInView` dispara — em vez de animar em 0.001s, que ainda causa
 * flicker.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export type RevealDirection = "up" | "down" | "left" | "right" | "none";

function offsetFor(direction: RevealDirection, distance: number) {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
    default:
      return {};
  }
}

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  distance = 26,
  direction = "up",
  once = true,
  amount = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  distance?: number;
  direction?: RevealDirection;
  once?: boolean;
  amount?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsetFor(direction, distance) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container que escalona os filhos. Use com `<RevealItem>` — os filhos
 * herdam o estado da variante do pai, então não precisam de `whileInView`
 * próprio (e não competem por observadores de interseção).
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  once = true,
  amount = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  once?: boolean;
  amount?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  const variants: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
}

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={ITEM_VARIANTS}>
      {children}
    </motion.div>
  );
}

/**
 * Deslocamento vertical suave conforme o elemento cruza a viewport.
 * `speed` positivo sobe mais devagar que a página (fundo), negativo sobe
 * mais rápido (primeiro plano).
 */
export function Parallax({
  children,
  className,
  speed = 60,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const smooth = useSpring(y, { stiffness: 90, damping: 24, mass: 0.5 });

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: smooth }}>{children}</motion.div>
    </div>
  );
}

/**
 * Contador que sobe quando entra em cena. Recebe o valor já formatado por
 * uma função para não travar o formato (mil / mi / R$) dentro do componente.
 */
export function CountUp({
  value,
  duration = 1400,
  format = (n: number) => String(Math.round(n)),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  // Com movimento reduzido o efeito nem roda: o valor final é derivado
  // direto no render, abaixo. Chamar setState aqui só pra chegar no mesmo
  // lugar custaria um render extra em cascata.
  useEffect(() => {
    if (!inView || reduce) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo: sobe rápido e assenta — leitura de "contador de painel".
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : shown)}
    </span>
  );
}

/** Barra fina no topo mostrando o progresso da leitura da página. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left"
    >
      <div className="h-full w-full bg-gradient-to-r from-[var(--pp-amber)] via-[var(--pp-ember)] to-[var(--pp-pepper)]" />
    </motion.div>
  );
}
