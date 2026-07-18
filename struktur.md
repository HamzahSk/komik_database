Kalau buat eksperimen, menurut gw ini struktur yang enak. Simpel tapi masih gampang dikembangin.

comics.json

Isinya cuma informasi komik.

{
  "solo-leveling": {
    "title": "Solo Leveling",
    "alternativeTitles": [
      "Only I Level Up",
      "나 혼자만 레벨업"
    ],
    "thumbnail": "https://...",
    "status": "Completed",
    "type": "Manhwa",
    "synopsis": "...",
    "genres": [
      "Action",
      "Fantasy"
    ],
    "releaseYear": 2018,
    "rating": 4.9,
    "chapterCount": 200
  },

  "one-piece": {
    "title": "One Piece",
    "alternativeTitles": [
      "ワンピース"
    ],
    "thumbnail": "https://...",
    "status": "Ongoing",
    "type": "Manga",
    "synopsis": "...",
    "genres": [
      "Adventure",
      "Action"
    ],
    "releaseYear": 1997,
    "rating": 4.95,
    "chapterCount": 1150
  }
}


---

chapters.json

Isinya semua chapter.

{
  "solo-leveling": {
    "1": {
      "title": "I'm Used To It",
      "releaseDate": 1712345678,

      "images": {
        "id": [
          {
            "page": 1,
            "source": "https://website-asli.com/1.jpg",
            "url": "https://..."
          },
          {
            "page": 2,
            "source": "https://website-asli.com/1.jpg",
            "url": null
          }
        ],

        "en": [
          {
            "page": 1,
            "source": "https://website-asli.com/1.jpg",
            "url": null
          }
        ]
      }
    },

    "2": {
      "title": "The Weakest Hunter",
      "releaseDate": 1712348900,

      "images": {
        "id": [],
        "en": []
      }
    }
  },

  "one-piece": {
    "1": {
      "title": "Romance Dawn",
      "releaseDate": 852076800,

      "images": {
        "id": [],
        "en": []
      }
    }
  }
}


---

comments.json

{
  "solo-leveling": [
    {
      "id": 1,
      "userId": "12345",
      "username": "Hamzah",
      "message": "Keren banget 🔥",
      "createdAt": 1752837000
    },
    {
      "id": 2,
      "userId": "99999",
      "username": "Zah",
      "message": "Chapter selanjutnya mana?",
      "createdAt": 1752838000
    }
  ],

  "one-piece": [
    {
      "id": 1,
      "userId": "88888",
      "username": "Luffy",
      "message": "Peak!",
      "createdAt": 1752839000
    }
  ]
}
