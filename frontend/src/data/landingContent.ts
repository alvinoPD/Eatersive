export interface LandingStep {
  icon: string;
  number: string;
  title: string;
  description: string;
}

export const LANDING_STEPS: LandingStep[] = [
  {
    icon: '↗',
    number: '01',
    title: 'Pesan Layanan',
    description:
      'Pilih jenis perawatan yang sesuai dengan kebutuhan sepatu Anda melalui platform kami.',
  },
  {
    icon: '◷',
    number: '02',
    title: 'Penjemputan',
    description:
      'Kurir kami akan menjemput sepatu Anda sesuai waktu dan lokasi yang Anda tentukan.',
  },
  {
    icon: '♧',
    number: '03',
    title: 'Perawatan Ahli',
    description:
      'Tim profesional kami akan membersihkan sepatu Anda menggunakan peralatan premium.',
  },
  {
    icon: '✓',
    number: '04',
    title: 'Pengantaran',
    description:
      'Sepatu yang sudah bersih dan harum akan kami antar kembali dengan kemasan eksklusif.',
  },
];

export interface LandingTestimonial {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    quote:
      '“Layanan terbaik! Sepatu Jordan saya yang tadinya kotor sekarang kembali seperti baru. Proses penjemputannya juga sangat on-time. Sangat direkomendasikan untuk kolektor sepatu.”',
    name: 'Andi Wijaya',
    role: 'Single dad Jakarta',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
  },
  {
    quote:
      '“Sangat membantu untuk saya yang sibuk. Cukup pesan lewat HP, sepatu diambil dan diantar dalam kondisi wangi dan bersih. Harganya juga sangat terjangkau untuk kualitas sekelas ini.”',
    name: 'Siti Rahma',
    role: 'Wirausaha',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
  },
];

export interface LandingFaq {
  question: string;
  answer: string;
}

export const LANDING_FAQS: LandingFaq[] = [
  {
    question: 'Berapa lama proses pencucian sepatu?',
    answer:
      'Proses pencucian standar biasanya memakan waktu 2–3 hari kerja, tergantung pada tingkat kekotoran dan jenis layanan yang dipilih.',
  },
  {
    question: 'Apakah semua jenis sepatu bisa dicuci?',
    answer:
      'Kami merawat sneakers, sepatu kulit, suede, kanvas, dan berbagai jenis bahan lainnya. Tim kami akan memilih metode yang sesuai dengan material sepatu Anda.',
  },
  {
    question: 'Bagaimana jika sepatu saya rusak saat proses cuci?',
    answer:
      'Setiap sepatu diperiksa terlebih dahulu sebelum perawatan. Kami menghubungi Anda untuk persetujuan jika ditemukan kondisi khusus atau risiko pada material.',
  },
  {
    question: 'Apakah ada biaya tambahan untuk penjemputan?',
    answer:
      'Biaya penjemputan bergantung pada lokasi. Kami akan menginformasikan biaya secara transparan sebelum pesanan dikonfirmasi.',
  },
  {
    question: 'Bagaimana cara melacak pesanan saya?',
    answer:
      'Buka halaman Lacak Pesanan dan gunakan nomor pesanan Anda untuk melihat status terbaru.',
  },
];
