// Lightweight i18n. Keys ARE the English strings, so any untranslated string
// falls back gracefully to English. Wrap visible copy in `t('English text')`
// (via usePrefs().t) inside client components. Currency conversion is separate
// (see lib/currency.ts + <Price/>).

type Lang = 'en' | 'hi' | 'fr' | 'es';

const HI: Record<string, string> = {
  // chrome
  'Stays': 'ठहराव', 'Explore': 'खोजें', 'Trips': 'यात्राएँ',
  'Become a host': 'होस्ट बनें', 'Host': 'होस्ट', 'Log in': 'लॉग इन', 'Sign up': 'साइन अप',
  'Search stays': 'ठहराव खोजें', 'Map search': 'मानचित्र खोज', 'Your trips': 'आपकी यात्राएँ',
  'Company': 'कंपनी', 'About StayOn': 'StayOn के बारे में', 'Careers': 'करियर',
  'Trust & safety': 'भरोसा और सुरक्षा',
  'Identity-verified accounts': 'पहचान-सत्यापित खाते',
  'Secure on-platform payments': 'सुरक्षित ऑन-प्लेटफ़ॉर्म भुगतान',
  '24/7 support': '24/7 सहायता',
  'Get travel inspiration in your inbox': 'यात्रा की प्रेरणा अपने इनबॉक्स में पाएं',
  'Subscribe': 'सब्सक्राइब करें',
  // host hero
  'Hosting on StayOn': 'StayOn पर होस्टिंग',
  'earning.': 'कमाई कर सकती है।',
  "Get started — it's free": 'शुरू करें — यह मुफ़्त है',
  'Browse stays': 'ठहराव देखें',
  'Guests verified': 'मेहमान सत्यापित',
  'Phone + ID checked before booking': 'बुकिंग से पहले फ़ोन + आईडी जाँचा जाता है',
  // host sections
  'See what your place could earn': 'देखें आपकी जगह कितना कमा सकती है',
  'Homes like yours are earning': 'आपके जैसे घर कमा रहे हैं',
  'Your place looks great on StayOn': 'StayOn पर आपकी जगह शानदार दिखती है',
  "You set the price. It's all yours.": 'आप कीमत तय करें। सब कुछ आपका है।',
  'Your questions, answered': 'आपके सवाल, जवाब के साथ',
  'Start earning with StayOn': 'StayOn के साथ कमाई शुरू करें',
  'Join hosts earning on StayOn': 'StayOn पर कमाई कर रहे होस्ट से जुड़ें',
  // price control tiles
  'You set the nightly price': 'आप रात्रि कीमत तय करें',
  'Weekend & seasonal rates': 'सप्ताहांत और मौसमी दरें',
  'Your own discounts': 'आपकी अपनी छूट',
  'Block any dates': 'कोई भी तारीख़ें ब्लॉक करें',
  'Every bit your guests pay is yours.': 'आपके मेहमान जो भी भुगतान करें, सब आपका है।',
  // estimator
  'Estimate your earnings': 'अपनी कमाई का अनुमान लगाएं',
  'Your nightly price': 'आपकी रात्रि कीमत',
  'Nights booked / month': 'बुक की गई रातें / माह',
  // features
  "It's easy": 'यह आसान है', "It's worth it": 'यह फ़ायदेमंद है', "You're protected": 'आप सुरक्षित हैं',
};

const FR: Record<string, string> = {
  'Stays': 'Séjours', 'Explore': 'Explorer', 'Trips': 'Voyages',
  'Become a host': 'Devenir hôte', 'Host': 'Hôte', 'Log in': 'Connexion', 'Sign up': "S'inscrire",
  'Search stays': 'Rechercher des séjours', 'Map search': 'Recherche sur carte', 'Your trips': 'Vos voyages',
  'Company': 'Entreprise', 'About StayOn': 'À propos de StayOn', 'Careers': 'Carrières',
  'Trust & safety': 'Confiance et sécurité',
  'Identity-verified accounts': "Comptes à identité vérifiée",
  'Secure on-platform payments': 'Paiements sécurisés sur la plateforme',
  '24/7 support': 'Assistance 24/7',
  'Get travel inspiration in your inbox': "Recevez de l'inspiration voyage dans votre boîte mail",
  'Subscribe': "S'abonner",
  'Hosting on StayOn': 'Héberger sur StayOn',
  'earning.': 'rapporter.',
  "Get started — it's free": "Commencer — c'est gratuit",
  'Browse stays': 'Parcourir les séjours',
  'Guests verified': 'Voyageurs vérifiés',
  'Phone + ID checked before booking': "Téléphone + pièce d'identité vérifiés avant réservation",
  'See what your place could earn': 'Voyez ce que votre logement pourrait rapporter',
  'Homes like yours are earning': 'Des logements comme le vôtre rapportent',
  'Your place looks great on StayOn': 'Votre logement est superbe sur StayOn',
  "You set the price. It's all yours.": "Vous fixez le prix. Tout est à vous.",
  'Your questions, answered': 'Vos questions, nos réponses',
  'Start earning with StayOn': 'Commencez à gagner avec StayOn',
  'Join hosts earning on StayOn': 'Rejoignez les hôtes qui gagnent sur StayOn',
  'You set the nightly price': 'Vous fixez le prix par nuit',
  'Weekend & seasonal rates': 'Tarifs week-end et saisonniers',
  'Your own discounts': 'Vos propres réductions',
  'Block any dates': "Bloquez n'importe quelles dates",
  'Every bit your guests pay is yours.': 'Chaque centime payé par vos voyageurs est à vous.',
  'Estimate your earnings': 'Estimez vos revenus',
  'Your nightly price': 'Votre prix par nuit',
  'Nights booked / month': 'Nuits réservées / mois',
  "It's easy": "C'est facile", "It's worth it": "Ça en vaut la peine", "You're protected": 'Vous êtes protégé',
};

const ES: Record<string, string> = {
  'Stays': 'Alojamientos', 'Explore': 'Explorar', 'Trips': 'Viajes',
  'Become a host': 'Conviértete en anfitrión', 'Host': 'Anfitrión', 'Log in': 'Iniciar sesión', 'Sign up': 'Registrarse',
  'Search stays': 'Buscar alojamientos', 'Map search': 'Búsqueda en mapa', 'Your trips': 'Tus viajes',
  'Company': 'Empresa', 'About StayOn': 'Acerca de StayOn', 'Careers': 'Empleo',
  'Trust & safety': 'Confianza y seguridad',
  'Identity-verified accounts': 'Cuentas con identidad verificada',
  'Secure on-platform payments': 'Pagos seguros en la plataforma',
  '24/7 support': 'Soporte 24/7',
  'Get travel inspiration in your inbox': 'Recibe inspiración de viaje en tu correo',
  'Subscribe': 'Suscribirse',
  'Hosting on StayOn': 'Anfitrión en StayOn',
  'earning.': 'generando ingresos.',
  "Get started — it's free": 'Empieza — es gratis',
  'Browse stays': 'Ver alojamientos',
  'Guests verified': 'Huéspedes verificados',
  'Phone + ID checked before booking': 'Teléfono + ID verificados antes de reservar',
  'See what your place could earn': 'Descubre cuánto podría generar tu alojamiento',
  'Homes like yours are earning': 'Alojamientos como el tuyo están generando ingresos',
  'Your place looks great on StayOn': 'Tu alojamiento luce genial en StayOn',
  "You set the price. It's all yours.": 'Tú pones el precio. Todo es tuyo.',
  'Your questions, answered': 'Tus preguntas, respondidas',
  'Start earning with StayOn': 'Empieza a ganar con StayOn',
  'Join hosts earning on StayOn': 'Únete a los anfitriones que ganan en StayOn',
  'You set the nightly price': 'Tú fijas el precio por noche',
  'Weekend & seasonal rates': 'Tarifas de fin de semana y temporada',
  'Your own discounts': 'Tus propios descuentos',
  'Block any dates': 'Bloquea cualquier fecha',
  'Every bit your guests pay is yours.': 'Cada parte que pagan tus huéspedes es tuya.',
  'Estimate your earnings': 'Estima tus ingresos',
  'Your nightly price': 'Tu precio por noche',
  'Nights booked / month': 'Noches reservadas / mes',
  "It's easy": 'Es fácil', "It's worth it": 'Vale la pena', "You're protected": 'Estás protegido',
};

const TABLES: Record<Lang, Record<string, string>> = { en: {}, hi: HI, fr: FR, es: ES };

export function translate(lang: string, s: string): string {
  const table = TABLES[(lang as Lang)] || TABLES.en;
  return table[s] || s;
}
