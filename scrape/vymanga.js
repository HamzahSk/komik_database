import * as cheerio from 'cheerio';
import path from 'path';

// --- CONFIGURATION ---
let baseUrl = "https://vymanga.net"; 
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- HELPER FUNCTIONS ---
export function setBaseUrl(url) {
    baseUrl = url;
}

function withCors(url) {
    return `${CORS}${url}`;
}

async function corsRequest(url) {
    const response = await fetch(withCors(url), { headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    return cheerio.load(html);
}

function getAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function parseChapterDate(dateString) {
    if (!dateString) return 0;
    
    const str = dateString.toLowerCase().trim();
    if (str.endsWith("ago")) {
        const match = str.match(/(\d+)/);
        if (!match) return 0;
        
        const number = parseInt(match[1], 10);
        const now = Date.now();
        
        if (str.includes("day")) return Math.floor((now - (number * 24 * 60 * 60 * 1000)) / 1000);
        if (str.includes("hour")) return Math.floor((now - (number * 60 * 60 * 1000)) / 1000);
        if (str.includes("minute")) return Math.floor((now - (number * 60 * 1000)) / 1000);
        if (str.includes("second")) return Math.floor((now - (number * 1000)) / 1000);
        return 0;
    }

    const timestamp = Date.parse(dateString);
    return isNaN(timestamp) ? 0 : Math.floor(timestamp / 1000);
}

// Fungsi pembantu generate slug unik dari URL komik untuk key JSON database
function generateSlug(mangaUrl) {
    // Mengambil bagian terakhir dari path url, misal '/manga/solo-leveling' -> 'solo-leveling'
    const cleanUrl = mangaUrl.replace(/\/$/, "");
    return path.basename(cleanUrl);
}

// Extract nomor chapter murni dari string (misal: "Chapter 123.5" -> "123.5")
function extractChapterNumber(chapterName) {
    const match = chapterName.match(/Chapter\s+(\d+(?:\.\d+)?)/i);
    if (match) return match[1];
    // Fallback jika polanya berbeda
    return chapterName.replace(/[^\d.]/g, '') || "0";
}

// --- MAIN SCRAPING FUNCTIONS ---

export async function getPopularManga(page = 1) {
    const url = `${baseUrl}/search${page !== 1 ? `?page=${page}` : ''}`;
    const $ = await corsRequest(url);
    
    const mangas = [];
    $('.comic-item').each((_, element) => {
        const urlPath = $(element).find('a').attr('href');
        mangas.push({
            url: getAbsoluteUrl(urlPath),
            title: $(element).find('.comic-title').text().trim(),
            thumbnail_url: getAbsoluteUrl($(element).find('.comic-image img.image.lozad').attr('data-src'))
        });
    });

    return mangas;
}

export async function getLatestUpdates(page = 1) {
    const url = `${baseUrl}/search?sort=updated_at${page !== 1 ? `&page=${page}` : ''}`;
    const $ = await corsRequest(url);
    
    const mangas = [];
    $('.comic-item').each((_, element) => {
        const urlPath = $(element).find('a').attr('href');
        mangas.push({
            url: getAbsoluteUrl(urlPath),
            title: $(element).find('.comic-title').text().trim(),
            thumbnail_url: getAbsoluteUrl($(element).find('.comic-image img.image.lozad').attr('data-src'))
        });
    });

    return mangas;
}

export async function searchManga(page = 1, query = '', filters = {}) {
    const urlObj = new URL(`${baseUrl}/search`);
    urlObj.searchParams.append('q', query);
    urlObj.searchParams.append('page', page.toString());

    for (const [key, value] of Object.entries(filters)) {
        urlObj.searchParams.append(key, value);
    }

    const $ = await corsRequest(urlObj.toString());
    
    const mangas = [];
    $('.comic-item').each((_, element) => {
        const urlPath = $(element).find('a').attr('href');
        mangas.push({
            url: getAbsoluteUrl(urlPath),
            title: $(element).find('.comic-title').text().trim(),
            thumbnail_url: getAbsoluteUrl($(element).find('.comic-image img.image.lozad').attr('data-src'))
        });
    });

    return mangas;
}

export async function getMangaDetails(mangaUrl) {
    const url = getAbsoluteUrl(mangaUrl);
    const $ = await corsRequest(url);

    const genres = [];
    $('.pre-title:contains(Genres) ~ a').each((_, el) => {
        genres.push($(el).text().trim());
    });

    let statusText = $('.pre-title:contains(Status) ~ span:not(.space)').text().trim();
    let status = 'Ongoing';
    if (statusText.toLowerCase().includes('completed')) status = 'Completed';

    // Mendeteksi Type secara dinamis lewat genre atau teks title jika ada
    let type = 'Manga';
    const checkText = genres.join(' ').toLowerCase();
    if (checkText.includes('manhwa') || checkText.includes('webtoon')) type = 'Manhwa';
    else if (checkText.includes('manhua')) type = 'Manhua';

    return {
        title: $('h1').text().trim(),
        alternativeTitles: [], // Kosongkan atau isi jika ada element alter title di HTML-nya
        thumbnail: getAbsoluteUrl($('.img-manga img').attr('src')),
        status: status,
        type: type,
        synopsis: $('.summary > .content').text().trim(),
        genres: genres,
        releaseYear: parseInt($('.pre-title:contains(Released) ~ a').text().trim(), 10) || new Date().getFullYear(),
        rating: parseFloat($('.score').text().trim()) || 0.0
    };
}

export async function getChapterList(mangaUrl) {
    const url = getAbsoluteUrl(mangaUrl);
    const $ = await corsRequest(url);

    const chapters = [];
    $('.list-group > a').each((_, element) => {
        const chapterUrl = $(element).attr('href');
        const dateText = $(element).find('> p').text().trim();
        
        chapters.push({
            url: getAbsoluteUrl(chapterUrl),
            name: $(element).find('span').first().text().trim(),
            date_upload: parseChapterDate(dateText)
        });
    });

    return chapters;
}

export async function getPageList(chapterUrl) {
    if (!chapterUrl.startsWith("http")) throw new Error("URL Chapter tidak valid.");
    
    const $ = await corsRequest(chapterUrl);
    
    const pages = [];
    $('img.d-block').each((index, element) => {
        const imageUrl = getAbsoluteUrl($(element).attr('data-src') || $(element).attr('src'));
        if (imageUrl) {
            pages.push({
                page: index + 1,
                source: imageUrl,
                url: null // diisi null dulu sesuai skema default penampung cloud kamu
            });
        }
    });

    return pages;
}

// --- DYNAMIC CORE ORCHESTRATOR FOR MAIN.JS ---

/**
 * Fungsi utama yang dipanggil oleh main.js secara otomatis.
 * Fungsi ini bertugas memilih komik secara acak lalu mengambil seluruh datanya.
 */
export async function scrapeComic(customUrl = null) {
    let targetMangaUrl = customUrl;

    // 1. Jika tidak ada URL spesifik, jalankan mode acak (Random Pick)
    if (!targetMangaUrl) {
        const methods = ['popular', 'latest', 'search'];
        const randomMethod = methods[Math.floor(Math.random() * methods.length)];
        
        console.log(`[vymanga] Memilih metode pencarian acak: ${randomMethod}`);
        let mangaList = [];

        if (randomMethod === 'popular') {
            mangaList = await getPopularManga(1);
        } else if (randomMethod === 'latest') {
            mangaList = await getLatestUpdates(1);
        } else if (randomMethod === 'search') {
            const sampleKeywords = ['action', 'level', 'reincarnation', 'fantasy', 'system'];
            const randomKeyword = sampleKeywords[Math.floor(Math.random() * sampleKeywords.length)];
            mangaList = await searchManga(1, randomKeyword);
        }

        if (!mangaList || mangaList.length === 0) {
            throw new Error("Gagal mendapatkan list manga dari metode acak.");
        }

        // Pilih satu manga secara acak dari list hasil scraping
        const randomManga = mangaList[Math.floor(Math.random() * mangaList.length)];
        targetMangaUrl = randomManga.url;
        console.log(`[vymanga] Terpilih komik acak: "${randomManga.title}"`);
    }

    const comicSlug = generateSlug(targetMangaUrl);

    // 2. Ambil detail metadata komik
    const comicData = await getMangaDetails(targetMangaUrl);

    // 3. Ambil daftar chapter
    const rawChapters = await getChapterList(targetMangaUrl);
    const chaptersData = {};

    // 4. Loop dan ambil list gambar dari tiap-tiap chapter
    // Note: Untuk testing/produksi masal, batasi loop ini jika dirasa terlalu berat/lambat
    for (const ch of rawChapters) {
        const chNumber = extractChapterNumber(ch.name);
        console.log(`[vymanga] Men-scrape gambar untuk Chapter ${chNumber}...`);
        
        try {
            const pages = await getPageList(ch.url);
            
            chaptersData[chNumber] = {
                title: ch.name,
                releaseDate: ch.date_upload,
                images: {
                    id: [], // Kosongkan/isi jika ada translate spesifik indo
                    en: pages  // Karena vymanga rata-rata inggris, kita default-kan masuk ke grup 'en'
                }
            };
            await delay(2000); 
        } catch (err) {
            console.error(`[vymanga] Gagal mengambil halaman untuk chapter ${ch.name}:`, err.message);
        }
    }

    // Return object dengan struktur baku yang diminta oleh core main.js
    return {
        comicSlug,
        comicData,
        chaptersData
    };
}
