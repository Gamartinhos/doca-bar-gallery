"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { useRef } from "react";

import { compactNumber } from "@/lib/pepper/format";

import { CountUp } from "./reveal";

/**
 * Hero da home da Pepper — "INFLUENCE IN MOTION".
 *
 * Os números da faixa de estatísticas chegam prontos por prop: quem sabe o
 * tamanho do casting é o servidor, que já leu o banco. O cliente aqui só
 * anima a contagem — inventar total no browser daria número diferente do
 * que a página mostra logo abaixo.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { stiffness: 90, damping: 26, mass: 0.5 };

/** Orquestra a cascata: cada peça entra ~80ms depois da anterior. */
const CASCADE: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

/**
 * Palavra da headline. O deslocamento é percentual (não px) para a entrada
 * ter o mesmo peso visual no celular e no monitor grande — a fonte é
 * clamp(3rem, 11vw, 9.5rem) e um valor fixo ficaria exagerado num e
 * invisível no outro.
 */
const WORD: Variants = {
  hidden: { y: "45%", opacity: 0 },
  shown: { y: "0%", opacity: 1, transition: { duration: 0.9, ease: EASE } },
};

const ITEM: Variants = {
  hidden: { y: 20, opacity: 0 },
  shown: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
};

const OUTLINE: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  shown: {
    opacity: 0.18,
    scale: 1,
    transition: { duration: 1.2, ease: EASE },
  },
};

const INTEIRO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const formatInteiro = (n: number) => INTEIRO.format(Math.round(n));
const formatAlcance = (n: number) => compactNumber(Math.round(n));

export type PepperHeroProps = {
  /** Quantidade de creators publicados. */
  creators: number;
  /** Soma de seguidores do casting (Instagram + TikTok). */
  reach: number;
  /** Capacidade de entrega do mês. */
  deliveries: number;
  /** Cidades cobertas pelo casting. */
  cities: number;
  /** Engajamento médio em percentual, ex.: 7.8 = 7,8%. */
  engagement: number;
};

export function PepperHero({
  creators,
  reach,
  deliveries,
  cities,
  engagement,
}: PepperHeroProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Duas velocidades: a malha anda pouco, a brasa anda mais. É o que cria a
  // sensação de profundidade sem nenhum 3D.
  const gridY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 80]),
    SPRING,
  );
  const heatY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 190]),
    SPRING,
  );

  const stats = [
    { label: "creators no casting", value: creators, format: formatInteiro },
    { label: "alcance somado", value: reach, format: formatAlcance },
    { label: "entregas por mês", value: deliveries, format: formatInteiro },
    { label: "cidades", value: cities, format: formatInteiro },
  ];

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[92svh] flex-col justify-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32"
    >
      {/* --- brasa de fundo --- */}
      <motion.div
        aria-hidden="true"
        style={reduce ? undefined : { y: heatY }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <span className="pp-heat left-[-14%] top-[-12%] h-[560px] w-[560px] opacity-70" />
        <span
          className="pp-heat right-[-10%] top-[18%] h-[420px] w-[420px] opacity-50 [animation-delay:1.4s]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--pp-ember) 55%, transparent), transparent 70%)",
          }}
        />
        <span
          className="pp-heat bottom-[-18%] left-[32%] h-[480px] w-[480px] opacity-45 [animation-delay:2.8s]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--pp-crimson) 60%, transparent), transparent 70%)",
          }}
        />
      </motion.div>

      {/* --- malha de asfalto, mascarada pro centro --- */}
      <motion.div
        aria-hidden="true"
        style={{
          ...(reduce ? {} : { y: gridY }),
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--pp-chalk) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--pp-chalk) 5%, transparent) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
          WebkitMaskImage:
            "radial-gradient(ellipse 72% 62% at 50% 42%, #000, transparent 78%)",
          maskImage:
            "radial-gradient(ellipse 72% 62% at 50% 42%, #000, transparent 78%)",
        }}
        className="pointer-events-none absolute inset-0 -z-10"
      />

      <motion.div
        variants={reduce ? undefined : CASCADE}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "shown"}
        className="relative mx-auto w-full max-w-7xl"
      >
        <motion.div
          variants={ITEM}
          className="mb-8 flex flex-wrap items-center gap-2"
        >
          <span className="pp-chip pp-chip-hot">
            <span className="pp-live-dot" /> casting aberto
          </span>
          <span className="pp-chip">
            engajamento médio {engagement.toFixed(1).replace(".", ",")}%
          </span>
          <span className="pp-chip">nascida no Doca</span>
        </motion.div>

        <div className="relative">
          {/* Cópia vazada atrás do título: dá espessura sem roubar contraste.
              O deslocamento fica no wrapper porque o motion escreve
              `transform` inline e apagaria um translate vindo da classe. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-0 select-none [transform:translate(0.035em,0.05em)]"
          >
            <motion.span
              variants={OUTLINE}
              className="pp-display pp-outline block opacity-[0.18]"
            >
              <span className="block">Influence</span>
              <span className="block">in motion</span>
            </motion.span>
          </span>

          <h1 className="pp-display relative z-[1]">
            <span className="block">
              <motion.span
                variants={WORD}
                className="inline-block text-[var(--pp-chalk)]"
              >
                Influence
              </motion.span>
            </span>
            <span className="block">
              <motion.span
                variants={WORD}
                className="inline-block text-[var(--pp-chalk)]"
              >
                in
              </motion.span>{" "}
              <motion.span variants={WORD} className="pp-hot-text inline-block">
                motion
              </motion.span>
            </span>
          </h1>
        </div>

        <motion.p
          variants={ITEM}
          className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--pp-mute)]"
        >
          Agência de influenciadores da noite. Casting curado de creators que
          vivem a pista, orçamento fechado na hora e material que no dia
          seguinte já está na galeria oficial do Doca.
        </motion.p>

        <motion.div
          variants={ITEM}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link href="/pepper/orcamento" className="pp-btn">
            Montar orçamento
          </Link>
          <Link href="/pepper/creators" className="pp-btn-ghost">
            Ver o casting
          </Link>
        </motion.div>

        <motion.dl
          variants={ITEM}
          className="pp-glass-lit mt-14 grid max-w-4xl grid-cols-2 gap-y-7 rounded-2xl px-6 py-7 sm:grid-cols-4 sm:gap-0"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="sm:border-l sm:border-[var(--pp-glass-brd)] sm:pl-6 sm:first:border-l-0 sm:first:pl-0"
            >
              <dd className="font-[family-name:var(--pp-font-display)] text-[clamp(1.9rem,4.5vw,2.75rem)] font-black leading-none tracking-[-0.04em] text-[var(--pp-chalk)]">
                <CountUp value={stat.value} format={stat.format} />
              </dd>
              <dt className="pp-label mt-2 text-[0.6rem]">{stat.label}</dt>
            </div>
          ))}
        </motion.dl>

        <motion.div variants={ITEM} className="mt-14 flex sm:mt-16">
          <a
            href="#casting"
            className="pp-label inline-flex flex-col items-center gap-2 transition-colors duration-200 hover:text-[var(--pp-chalk)]"
          >
            <span>rolar pro casting</span>
            <span
              aria-hidden="true"
              className="pp-drift block h-9 w-px bg-gradient-to-b from-[var(--pp-ember)] to-transparent"
            />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
