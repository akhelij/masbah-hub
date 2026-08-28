import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);
const ahead = (days: number) => new Date(Date.now() + days * DAY);

// Duplicated from src/lib/scoring.ts — the seed runs outside the Next module graph.
const PRIORITY_CITIES = ["Casablanca", "Marrakech", "Rabat", "Dar Bouazza", "Bouskoura"];
const TARGET_CITIES = [
  "Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès",
  "Bouskoura", "Dar Bouazza", "Mohammedia", "Essaouira", "Témara", "El Jadida",
];

function computeScore(l: {
  phone?: string | null; whatsapp?: string | null; email?: string | null;
  website?: string | null; city: string; rating?: number | null;
  address?: string | null; tags?: string[]; latitude?: number | null;
}) {
  let s = 0;
  if (l.whatsapp) s += 25; else if (l.phone) s += 20;
  if (l.email) s += 10;
  if (l.website) s += 8;
  if (l.address) s += 5;
  if (l.latitude != null) s += 4;
  if (PRIORITY_CITIES.some((c) => c.toLowerCase() === l.city.toLowerCase())) s += 20;
  else if (TARGET_CITIES.some((c) => c.toLowerCase() === l.city.toLowerCase())) s += 12;
  if (typeof l.rating === "number") {
    if (l.rating >= 4.5) s += 15; else if (l.rating >= 4) s += 11; else if (l.rating >= 3) s += 6;
  }
  const tags = (l.tags ?? []).map((t) => t.toLowerCase());
  if (tags.includes("has-pool") || tags.includes("piscine")) s += 10;
  if (tags.includes("villa") || tags.includes("riad")) s += 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

async function main() {
  console.log("→ Seeding Masbah.ma hub…");

  // ---------------------------------------------------------------- Users
  const passwordHash = await bcrypt.hash("masbah2026", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@masbah.ma" },
    update: {},
    create: { name: "Youssef El Amrani", email: "admin@masbah.ma", passwordHash, role: "ADMIN" },
  });
  const operator = await prisma.user.upsert({
    where: { email: "operator@masbah.ma" },
    update: {},
    create: { name: "Salma Bennani", email: "operator@masbah.ma", passwordHash, role: "OPERATOR" },
  });
  await prisma.user.upsert({
    where: { email: "viewer@masbah.ma" },
    update: {},
    create: { name: "Invité", email: "viewer@masbah.ma", passwordHash, role: "VIEWER" },
  });

  // ------------------------------------------------------------ Templates
  const templates: Prisma.TemplateCreateInput[] = [
    {
      name: "Premier contact — WhatsApp (FR)",
      channel: "WHATSAPP",
      language: "FR",
      category: "INITIAL_OUTREACH",
      body: `Bonjour {{name}} 👋

Je suis {{sender}} de Masbah.ma. On met en relation les propriétaires de piscines privées à {{city}} avec des familles qui cherchent un créneau privatif le weekend.

Votre piscine peut vous rapporter sans rien changer à vos habitudes : vous choisissez vos créneaux, l'inscription est gratuite et sans engagement.

Ça vous intéresse d'en savoir plus ?`,
      variables: ["name", "city", "sender"],
    },
    {
      name: "Premier contact — WhatsApp (AR)",
      channel: "WHATSAPP",
      language: "AR",
      category: "INITIAL_OUTREACH",
      body: `السلام عليكم {{name}} 👋

أنا {{sender}} من Masbah.ma. كنربطو أصحاب المسابح الخاصة ف{{city}} مع عائلات باغيين يكريو المسبح لوقت خاص فالويكاند.

المسبح ديالك يقدر يجيب ليك دخل بلا ما تبدل والو: نتا لي كتختار الأوقات، التسجيل مجاني وبلا التزام.

واش يهمك تعرف كثر؟`,
      variables: ["name", "city", "sender"],
    },
    {
      name: "Relance #1 (3 jours)",
      channel: "WHATSAPP",
      language: "FR",
      category: "FOLLOW_UP_1",
      body: `Bonjour {{name}}, je reviens vers vous rapidement 🙂

Beaucoup de propriétaires à {{city}} louent leur piscine 4 à 6 journées par mois pendant la saison. La publication prend 10 minutes et vous gardez la main sur vos disponibilités.

Voulez-vous que je vous envoie un exemple d'annonce ?`,
      variables: ["name", "city"],
    },
    {
      name: "Relance #2 (dernière)",
      channel: "WHATSAPP",
      language: "FR",
      category: "FOLLOW_UP_2",
      body: `Bonjour {{name}}, dernier message de ma part pour ne pas vous déranger 🙏

Si un jour vous voulez rentabiliser votre piscine, je garde votre contact et je reviens vers vous avant l'été prochain.

Bonne continuation !`,
      variables: ["name"],
    },
    {
      name: "Onboarding — bienvenue",
      channel: "WHATSAPP",
      language: "FR",
      category: "ONBOARDING",
      body: `Bienvenue chez Masbah.ma {{name}} 🎉

Pour publier votre piscine, j'ai besoin de :
1. 4 à 6 photos (piscine, terrasse, accès)
2. Votre prix souhaité par journée
3. Vos créneaux disponibles

Envoyez-moi tout ça ici et je m'occupe du reste.`,
      variables: ["name"],
    },
    {
      name: "Réengagement — avant l'été",
      channel: "WHATSAPP",
      language: "FR",
      category: "RE_ENGAGEMENT",
      body: `Bonjour {{name}}, la saison démarre à {{city}} et la demande explose ☀️

On avait échangé il y a quelques mois. Si vous voulez tester ce mois-ci, je vous publie l'annonce gratuitement aujourd'hui.

On y va ?`,
      variables: ["name", "city"],
    },
  ];

  for (const data of templates) {
    const existing = await prisma.template.findFirst({ where: { name: data.name } });
    if (!existing) await prisma.template.create({ data });
  }
  const initialTemplate = await prisma.template.findFirst({
    where: { category: "INITIAL_OUTREACH", language: "FR" },
  });

  // ---------------------------------------------------------------- Leads
  if ((await prisma.lead.count()) === 0) {
    const leadSeeds = [
      {
        name: "Villa Palmier — Ahmed Tazi", phone: "0661234567", whatsapp: "0661234567",
        email: "a.tazi@example.ma", city: "Casablanca", address: "Californie, Casablanca",
        source: "GOOGLE_MAPS" as const, sourceQuery: "villa avec piscine casablanca",
        status: "ACTIVE" as const, rating: 4.8, tags: ["has-pool", "villa", "premium"],
        website: "https://villapalmier.ma", latitude: 33.5563, longitude: -7.6402,
        poolName: "Piscine Villa Palmier", poolCity: "Casablanca", pricePerDay: 1800, pricePerHour: 300,
        capacity: 20, amenities: ["jacuzzi", "bbq", "parking", "wifi"],
        notes: "Très réactif. Disponible surtout le weekend.",
        createdAt: ago(48), firstContactAt: ago(46), lastContactAt: ago(9), contactCount: 5,
      },
      {
        name: "Riad Zitoun — Fatima Ouazzani", phone: "0662345678", whatsapp: "0662345678",
        email: "contact@riadzitoun.ma", city: "Marrakech", address: "Route de l'Ourika, Marrakech",
        source: "GOOGLE_MAPS" as const, sourceQuery: "riad piscine marrakech",
        status: "LISTED" as const, rating: 4.6, tags: ["has-pool", "riad"],
        latitude: 31.5891, longitude: -7.9861,
        poolName: "Bassin Riad Zitoun", poolCity: "Marrakech", pricePerDay: 1400, pricePerHour: 250,
        capacity: 15, amenities: ["bbq", "parking", "transat"],
        notes: "Photos envoyées, annonce en ligne depuis 2 semaines.",
        createdAt: ago(35), firstContactAt: ago(33), lastContactAt: ago(6), contactCount: 4,
      },
      {
        name: "Dar Anass — Karim Idrissi", phone: "0663456789", whatsapp: "0663456789",
        city: "Dar Bouazza", address: "Dar Bouazza, Casablanca",
        source: "FACEBOOK" as const, status: "ONBOARDING" as const, rating: 4.2,
        tags: ["has-pool", "villa"], latitude: 33.5133, longitude: -7.8167,
        notes: "Attend les photos. Relancer avec exemple d'annonce.",
        nextFollowUpAt: ago(1),
        createdAt: ago(21), firstContactAt: ago(20), lastContactAt: ago(4), contactCount: 3,
      },
      {
        name: "Résidence Al Manar — Nadia Sefrioui", phone: "0664567890",
        email: "nadia.sefrioui@example.ma", city: "Rabat", address: "Souissi, Rabat",
        source: "REFERRAL" as const, status: "MEETING_SCHEDULED" as const, rating: 4.5,
        tags: ["has-pool", "villa"], latitude: 33.9716, longitude: -6.8498,
        notes: "RDV visite prévu. Recommandée par Ahmed Tazi.",
        nextFollowUpAt: ahead(2),
        createdAt: ago(14), firstContactAt: ago(13), lastContactAt: ago(2), contactCount: 3,
      },
      {
        name: "Villa Océane — Hicham Berrada", phone: "0665678901", whatsapp: "0665678901",
        city: "Tanger", address: "Malabata, Tanger", source: "GOOGLE_MAPS" as const,
        sourceQuery: "villa piscine tanger", status: "RESPONDED" as const, rating: 4.0,
        tags: ["has-pool", "villa"], latitude: 35.7806, longitude: -5.7761,
        notes: "Intéressé mais veut connaître la commission.",
        nextFollowUpAt: ahead(1),
        createdAt: ago(11), firstContactAt: ago(10), lastContactAt: ago(1), contactCount: 2,
      },
      {
        name: "Maison Argan — Samira Lahlou", phone: "0666789012", city: "Agadir",
        address: "Founty, Agadir", source: "INSTAGRAM" as const, status: "CONTACTED" as const,
        rating: 3.9, tags: ["has-pool"], latitude: 30.4067, longitude: -9.6,
        nextFollowUpAt: ago(2),
        createdAt: ago(9), firstContactAt: ago(8), lastContactAt: ago(8), contactCount: 1,
      },
      {
        name: "Villa Ryad — Omar Chraibi", phone: "0667890123", whatsapp: "0667890123",
        email: "omar.chraibi@example.ma", city: "Bouskoura", address: "Bouskoura Golf City",
        source: "GOOGLE_MAPS" as const, sourceQuery: "villa avec piscine bouskoura",
        status: "CONTACTED" as const, rating: 4.7, tags: ["has-pool", "villa", "premium"],
        website: "https://example.ma/villa-ryad", latitude: 33.4489, longitude: -7.6489,
        createdAt: ago(6), firstContactAt: ago(5), lastContactAt: ago(5), contactCount: 1,
      },
      {
        name: "Chalet Bleu — Rachid Amrani", phone: "0668901234", city: "Mohammedia",
        source: "WEBSITE" as const, status: "NEW" as const, tags: ["has-pool"],
        createdAt: ago(4),
      },
      {
        name: "Villa Jasmin — Leila Bakkali", phone: "0669012345", whatsapp: "0669012345",
        city: "Marrakech", address: "Palmeraie, Marrakech", source: "GOOGLE_MAPS" as const,
        sourceQuery: "villa piscine palmeraie", status: "NEW" as const, rating: 4.9,
        tags: ["has-pool", "villa", "premium"], latitude: 31.6642, longitude: -7.9539,
        createdAt: ago(2),
      },
      {
        name: "Dar Salam — Mehdi Fassi", phone: "0670123456", city: "Fès",
        source: "MANUAL" as const, status: "LOST" as const, tags: ["riad"],
        notes: "Pas de piscine finalement — bassin décoratif.",
        createdAt: ago(28), firstContactAt: ago(27), lastContactAt: ago(20), contactCount: 2,
      },
      {
        name: "Villa Sable — Yassine Moutawakil", phone: "0671234567", whatsapp: "0671234567",
        city: "Essaouira", source: "ADS" as const, status: "NEW" as const, rating: 4.1,
        tags: ["has-pool", "villa"], createdAt: ago(1),
      },
      {
        name: "Résidence Zerktouni — Amina Cherkaoui", phone: "0672345678",
        email: "amina.ch@example.ma", city: "Casablanca", address: "Maârif, Casablanca",
        source: "WHATSAPP" as const, status: "PAUSED" as const, rating: 4.3,
        tags: ["has-pool"], poolCity: "Casablanca", pricePerDay: 1200,
        notes: "En pause jusqu'à la fin des travaux (septembre).",
        createdAt: ago(40), firstContactAt: ago(39), lastContactAt: ago(15), contactCount: 6,
      },
    ];

    for (const [i, seed] of leadSeeds.entries()) {
      const lead = await prisma.lead.create({
        data: {
          ...seed,
          score: computeScore(seed),
          assignedToId: i % 2 === 0 ? admin.id : operator.id,
        },
      });

      await prisma.activity.create({
        data: {
          leadId: lead.id, userId: admin.id, type: "CREATED",
          title: `Prospect créé depuis ${seed.source}`, createdAt: lead.createdAt,
        },
      });

      if (seed.contactCount) {
        await prisma.message.create({
          data: {
            leadId: lead.id, channel: "WHATSAPP", direction: "OUTBOUND", language: "FR",
            templateId: initialTemplate?.id ?? null,
            content: (initialTemplate?.body ?? "Bonjour {{name}}")
              .replace(/\{\{name\}\}/g, seed.name.split("—")[1]?.trim() ?? seed.name)
              .replace(/\{\{city\}\}/g, seed.city)
              .replace(/\{\{sender\}\}/g, "Youssef"),
            sentAt: seed.firstContactAt, createdAt: seed.firstContactAt!,
          },
        });
        await prisma.activity.create({
          data: {
            leadId: lead.id, userId: admin.id, type: "MESSAGE_SENT",
            title: "Message de prospection envoyé (WhatsApp)", createdAt: seed.firstContactAt!,
          },
        });
      }

      if (["RESPONDED", "MEETING_SCHEDULED", "ONBOARDING", "LISTED", "ACTIVE", "PAUSED"].includes(seed.status ?? "")) {
        await prisma.message.create({
          data: {
            leadId: lead.id, channel: "WHATSAPP", direction: "INBOUND", language: "FR",
            content: "Bonjour, oui ça m'intéresse. C'est quoi la commission exactement ?",
            createdAt: seed.lastContactAt ?? ago(3),
          },
        });
        await prisma.activity.create({
          data: {
            leadId: lead.id, type: "MESSAGE_RECEIVED", title: "Le prospect a répondu",
            createdAt: seed.lastContactAt ?? ago(3),
          },
        });
        await prisma.activity.create({
          data: {
            leadId: lead.id, userId: admin.id, type: "STATUS_CHANGE",
            title: `Statut : CONTACTED → ${seed.status}`,
            createdAt: seed.lastContactAt ?? ago(3),
          },
        });
      }
    }
  }

  // -------------------------------------------------------------- Content
  if ((await prisma.contentPost.count()) === 0) {
    await prisma.contentPost.createMany({
      data: [
        {
          title: "3 raisons de louer votre piscine cet été",
          content: `Votre piscine est vide 90% du temps. ☀️

À Casablanca, une journée privative se loue entre 1 200 et 2 000 DH. Sur un mois d'été, ça fait un revenu qui paie l'entretien, le gardien… et bien plus.

Ce que Masbah.ma change :
✅ Vous choisissez vos créneaux
✅ Les clients sont vérifiés
✅ Publication gratuite, zéro engagement

Votre piscine peut travailler pour vous. Écrivez-nous en DM.`,
          contentAr: `المسبح ديالك خاوي 90% من الوقت ☀️

فالدار البيضا، نهار واحد ديال الكرا كيوصل من 1200 ل2000 درهم. فشهر ديال الصيف، هادشي كيخلص الصيانة والحارس... وزيادة.

مع Masbah.ma :
✅ نتا لي كتختار الأوقات
✅ الكليان متأكد منهم
✅ التسجيل مجاني وبلا التزام

صيفط لينا رسالة.`,
          hashtags: ["#Masbah", "#Casablanca", "#PiscinePrivée", "#Maroc", "#LocationPiscine", "#Été2026", "#Weekend", "#Marrakech"],
          platform: "INSTAGRAM", postType: "EDUCATIONAL", status: "PUBLISHED",
          publishedAt: ago(5), likes: 342, comments: 28, shares: 17,
          imagePrompt: "Cinematic wide shot of a private villa pool in Casablanca at golden hour, turquoise water, palm trees, Moroccan tilework, warm sunlight, shallow depth of field, editorial photography",
        },
        {
          title: "Témoignage — Ahmed, Casablanca",
          content: `« Je pensais que personne ne louerait ma piscine. En 3 semaines, j'ai eu 6 réservations. » — Ahmed, Californie, Casablanca 🏊

Sa piscine ne servait que 2 weekends par mois. Aujourd'hui, elle génère un revenu régulier sans qu'il change quoi que ce soit à ses habitudes.

Vous avez une piscine à Casa, Marrakech ou Rabat ? Parlons-en.`,
          hashtags: ["#Témoignage", "#Masbah", "#Casablanca", "#RevenuPassif", "#PiscineMaroc", "#Maroc"],
          platform: "FACEBOOK", postType: "SOCIAL_PROOF", status: "SCHEDULED",
          scheduledAt: ahead(2),
          imagePrompt: "Warm candid portrait of a Moroccan homeowner in his 40s smiling beside his private pool, late afternoon light, documentary style, natural colors",
        },
        {
          title: "FAQ — Est-ce que c'est sécurisé ?",
          content: `« Et si quelqu'un casse quelque chose ? » 🤔

La question qu'on nous pose le plus. Voici la réponse :

1️⃣ Chaque client est identifié (CIN + téléphone vérifié)
2️⃣ Vous fixez vos règles (nombre de personnes, horaires, musique)
3️⃣ Une caution est demandée à la réservation
4️⃣ Vous pouvez refuser une demande, sans justification

Votre piscine, vos règles. Toujours.`,
          hashtags: ["#FAQ", "#Masbah", "#Sécurité", "#PiscinePrivée", "#Maroc", "#Confiance"],
          platform: "INSTAGRAM", postType: "FAQ", status: "DRAFT",
          imagePrompt: "Clean minimal flat-lay of a pool key, smartphone showing a booking app, and Moroccan mint tea on a marble table, soft daylight, top-down",
        },
      ],
    });
  }

  // ----------------------------------------------------------- Automations
  if ((await prisma.automation.count()) === 0) {
    await prisma.automation.createMany({
      data: [
        {
          name: "Nouveau prospect → n8n",
          description: "Envoie chaque nouveau prospect vers un webhook n8n pour enrichissement.",
          trigger: "LEAD_CREATED", action: "SEND_WEBHOOK",
          actionConfig: { url: "https://n8n.example.com/webhook/masbah-new-lead" },
          isActive: false,
        },
        {
          name: "Prospect contacté → relance à J+3",
          description: "Planifie automatiquement une relance 3 jours après le premier contact.",
          trigger: "LEAD_STATUS_CHANGED", action: "SCHEDULE_FOLLOW_UP",
          conditions: { toStatus: "CONTACTED" }, actionConfig: { days: 3 },
          isActive: true,
        },
        {
          name: "Réponse entrante → statut RESPONDED",
          description: "Dès qu'un prospect répond, il passe au statut « A répondu ».",
          trigger: "MESSAGE_RECEIVED", action: "CHANGE_STATUS",
          actionConfig: { status: "RESPONDED" }, isActive: true,
        },
      ],
    });
  }

  // -------------------------------------------------------------- Settings
  await prisma.setting.upsert({
    where: { key: "business" },
    update: {},
    create: {
      key: "business",
      value: {
        name: "Masbah.ma",
        tagline: "La marketplace des piscines privées au Maroc",
        senderName: "Youssef",
        defaultLanguage: "FR",
        defaultCity: "Casablanca",
        commissionPercent: 15,
      },
    },
  });

  const counts = {
    users: await prisma.user.count(),
    leads: await prisma.lead.count(),
    templates: await prisma.template.count(),
    messages: await prisma.message.count(),
    content: await prisma.contentPost.count(),
    automations: await prisma.automation.count(),
  };
  console.log("✓ Seed terminé:", counts);
  console.log("  Connexion: admin@masbah.ma / masbah2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
