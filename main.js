import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRAPE_DIR = path.join(__dirname, 'scrape');
const COMICS_FILE = path.join(__dirname, 'comics.json');
const CHAPTERS_FILE = path.join(__dirname, 'chapters.json');

/**
 * Inisialisasi file JSON database jika belum ada
 */
async function initDatabase() {
  for (const file of [COMICS_FILE, CHAPTERS_FILE]) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify({}, null, 2), 'utf-8');
    }
  }
}

async function readData(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeData(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Otomatis meload semua file scraper yang ada di folder 'scrape'
 */
async function loadScrapers() {
  try {
    const files = await fs.readdir(SCRAPE_DIR);
    // Hanya ambil file berekstensi .js dan hiraukan file yang diawali underscore '_'
    const scraperFiles = files.filter(file => file.endsWith('.js') && !file.startsWith('_'));
    
    const scrapers = {};
    for (const file of scraperFiles) {
      const scraperName = path.basename(file, '.js');
      const scraperPath = path.join(SCRAPE_DIR, file);
      
      // Menggunakan dynamic import khusus ESM
      const module = await import(`file://${scraperPath}`);
      scrapers[scraperName] = module.default || module;
    }
    return scrapers;
  } catch (error) {
    console.error('Gagal meload folder scrape:', error.message);
    return {};
  }
}

/**
 * Fungsi utama untuk menjalankan scraper dan menyusun datanya ke format JSON target
 * @param {string} sourceName - Nama file scraper di folder scrape (misal: 'vymanga')
 * @param {string|null} comicUrl - URL target (Opsional. Jika null, scraper akan mencari secara acak)
 */
async function runScraper(sourceName, comicUrl = null) {
  const scrapers = await loadScrapers();
  const scraper = scrapers[sourceName];

  if (!scraper) {
    console.error(`Scraper "${sourceName}" tidak ditemukan di folder ${SCRAPE_DIR}`);
    return;
  }

  await initDatabase();
  
  if (comicUrl) {
    console.log(`[${sourceName}] Memulai scraping target spesifik: ${comicUrl}...`);
  } else {
    console.log(`[${sourceName}] Memulai scraping dalam mode otomatis/acak...`);
  }

  try {
    // Jalankan logika internal scraper masing-masing source
    // Menerima parameter comicUrl (bisa berupa URL atau null untuk mode acak)
    const { comicSlug, comicData, chaptersData } = await scraper.scrapeComic(comicUrl);

    if (!comicSlug) {
      throw new Error("Scraper wajib mengembalikan 'comicSlug' sebagai unique key identifier!");
    }

    // Baca database lokal saat ini
    const currentComics = await readData(COMICS_FILE);
    const currentChapters = await readData(CHAPTERS_FILE);

    // 1. UPDATE comics.json[span_3](start_span)[span_3](end_span)
    currentComics[comicSlug] = {
      ...currentComics[comicSlug],
      ...comicData,
      // Gabungkan array agar tidak duplikat jika datanya sudah ada sebelumnya
      alternativeTitles: Array.from(new Set([
        ...(currentComics[comicSlug]?.alternativeTitles || []),
        ...(comicData.alternativeTitles || [])
      ])),
      genres: Array.from(new Set([
        ...(currentComics[comicSlug]?.genres || []),
        ...(comicData.genres || [])
      ])),
      updatedAt: Math.floor(Date.now() / 1000)
    };

    // 2. UPDATE chapters.json (Deep nesting merge)[span_4](start_span)[span_4](end_span)
    if (!currentChapters[comicSlug]) {
      currentChapters[comicSlug] = {};
    }

    for (const [chapterNum, newChapterContent] of Object.entries(chaptersData)) {
      const existingChapter = currentChapters[comicSlug][chapterNum] || {};
      
      const mergedImages = {
        id: existingChapter.images?.id || [],
        en: existingChapter.images?.en || []
      };

      if (newChapterContent.images) {
        for (const [lang, pageList] of Object.entries(newChapterContent.images)) {
          if (!mergedImages[lang]) mergedImages[lang] = [];
          
          // Lakukan upsert berdasarkan nomor halaman ('page') supaya tidak duplikat image array[span_5](start_span)[span_5](end_span)
          pageList.forEach(newPage => {
            const foundIndex = mergedImages[lang].findIndex(p => p.page === newPage.page);
            if (foundIndex > -1) {
              mergedImages[lang][foundIndex] = { ...mergedImages[lang][foundIndex], ...newPage };
            } else {
              mergedImages[lang].push(newPage);
            }
          });
          
          // Urutkan halaman agar rapi
          mergedImages[lang].sort((a, b) => a.page - b.page);
        }
      }

      currentChapters[comicSlug][chapterNum] = {
        title: newChapterContent.title || existingChapter.title || `Chapter ${chapterNum}`,
        releaseDate: newChapterContent.releaseDate || existingChapter.releaseDate || Math.floor(Date.now() / 1000),
        images: mergedImages
      };
    }

    // Sinkronisasi field total chapterCount ke dalam data metadata comics.json[span_6](start_span)[span_6](end_span)
    currentComics[comicSlug].chapterCount = Object.keys(currentChapters[comicSlug]).length;

    // Simpan semua perubahan ke storage JSON
    await writeData(COMICS_FILE, currentComics);
    await writeData(CHAPTERS_FILE, currentChapters);

    console.log(`[BERHASIL] Data "${comicSlug}" berhasil disinkronisasikan ke local database.`);

  } catch (error) {
    console.error(`[GAGAL] Terjadi error saat mengeksekusi scraper [${sourceName}]:`, error);
  }
}

/**
 * Contoh Trigger Eksekusi Otomatis.
 * Jika kamu ingin menjalankan main.js langsung via terminal (misal: node main.js)
 */
async function autoRun() {
  // Menjalankan scraper 'vymanga' dalam mode acak (karena parameter kedua tidak diisi)
  await runScraper('vymanga');
}

// Jalankan jika file ini dieksekusi secara langsung
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  autoRun();
}

export { runScraper };
