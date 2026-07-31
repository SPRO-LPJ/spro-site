// SPRO — Librairies tierces servies depuis notre propre domaine.
// Elles étaient chargées depuis cdnjs/unpkg : si l'un des deux CDN tombe ou est
// bloqué, le hero et le scroll fluide cassent. On les embarque donc au build.
// Ce module doit être évalué avant hero.js et site.js, qui les lisent en global.
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.Lenis = Lenis;
