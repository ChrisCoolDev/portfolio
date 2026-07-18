export interface Project {
  title: string;
  href: string;
  image: string;
  techStack: string;
  description: string;
  type: "client" | "opensource" | "side-project";
}

/**
 * Liste centralisée de tous les projets.
 * Les projets sont ordonnés du plus récent au plus ancien.
 * La page d'accueil affiche les 3 premiers (les plus récents).
 * La page /projects affiche tous les projets.
 */
export const projects: Project[] = [
  {
    title: "QAlive",
    href: "https://qalive.ink",
    image: "/projects_images/qaliveThumbnail.png",
    techStack: "VueJs, Supabase, TailwindCSS",
    description:
      "Plateforme interactive de Q&A en temps réel qui permet aux organisateurs d'événements d'engager leur audience via des questions live, des votes et de la modération — pour rendre chaque événement plus dynamique.",
    type: "side-project",
  },
  {
    title: "Connecteur360",
    href: "https://connecteur360.com",
    image: "/projects_images/connecteur360Thumbnail.png",
    techStack: "RactJS, Tanstack, Zustand, Laravel, MySQL",
    description:
      "Plateforme client full-stack connectant les entreprises à leur audience via une expérience digitale fluide. Développée de zéro pour Connecteur360.",
    type: "client",
  },
  {
    title: "Calendar",
    href: "https://calendar-app-4qc0.onrender.com/home",
    image: "/projects_images/calendarThumbnail.png",
    techStack: "Laravel, Livewire, Alpine.js, Tailwindcss",
    description:
      "Une application de calendrier soigneusement conçue pour suivre les anniversaires de ses proches — avec des rappels, une interface épurée et une touche personnelle.",
    type: "side-project",
  },
  {
    title: "Haku studio",
    href: "https://haku-landing-page-blue.vercel.app/",
    image: "/projects_images/hakuStudioThumbnail.png",
    techStack: "ReactJS, TailwindCSS",
    description:
      "Conception et développement d'une landing page audacieuse et visuelle pour Haku.Studio — une agence créative. Du concept à l'intégration pixel-perfect.",
    type: "client",
  },
  {
    title: "Yeezy clone web app",
    href: "https://yeezy-clone-psi.vercel.app/",
    image: "/projects_images/yeezyThumbnail.png",
    techStack: "Vue, Tailwind, jspdf, htmltocanvas",
    description:
      "Clone complet de l'expérience e-commerce Yeezy — de la navigation produit au checkout — avec des fonctionnalités ajoutées comme la génération de reçus PDF via jsPDF et html2canvas.",
    type: "side-project",
  },
  {
    title: "Personal blog",
    href: "https://sirhc-eight.vercel.app/blog",
    image: "/projects_images/portfolioBlogThumbnail.png",
    techStack: "Astro, Notion Api, I8n ",
    description:
      "Mon blog personnel construit avec Astro et alimenté par l'API Notion comme CMS headless. Propose du contenu bilingue avec support i18n et une expérience de lecture minimaliste.",
    type: "side-project",
  },
  {
    title: "Nidouye",
    href: "https://nidouye.fr",
    image: "/projects_images/nidouyeThumbnail.png",
    techStack: "Figma, UX Design, Product Design",
    description:
      "Intervention en tant que Product Designer sur cette application web francaise de mise en relation des foyers a la recherche de nounous et de ces dernieres",
    type: "client",
  }
];
