const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const locations = [
  // ==================== EUROPE ====================
  // France
  { lat: 48.8584, lng: 2.2945, country: "France", difficulty: "easy" }, // Eiffel Tower, Paris
  { lat: 48.8606, lng: 2.3376, country: "France", difficulty: "easy" }, // Louvre Museum, Paris
  { lat: 43.2965, lng: 5.3698, country: "France", difficulty: "medium" }, // Vieux Port, Marseille
  { lat: 45.764, lng: 4.8357, country: "France", difficulty: "medium" }, // Place Bellecour, Lyon
  { lat: 43.7102, lng: 7.262, country: "France", difficulty: "easy" }, // Promenade des Anglais, Nice
  { lat: 44.8378, lng: -0.5792, country: "France", difficulty: "medium" }, // Place de la Bourse, Bordeaux
  { lat: 48.5831, lng: 7.7479, country: "France", difficulty: "hard" }, // Petite France, Strasbourg

  // United Kingdom
  { lat: 51.5007, lng: -0.1246, country: "United Kingdom", difficulty: "easy" }, // Big Ben, London
  { lat: 51.5033, lng: -0.1195, country: "United Kingdom", difficulty: "easy" }, // London Eye, London
  { lat: 55.9486, lng: -3.1998, country: "United Kingdom", difficulty: "easy" }, // Edinburgh Castle, Edinburgh
  {
    lat: 53.4084,
    lng: -2.9916,
    country: "United Kingdom",
    difficulty: "medium",
  }, // Albert Dock, Liverpool
  {
    lat: 51.4545,
    lng: -2.5879,
    country: "United Kingdom",
    difficulty: "medium",
  }, // Cabot Circus, Bristol
  {
    lat: 51.752,
    lng: -1.2577,
    country: "United Kingdom",
    difficulty: "medium",
  }, // Radcliffe Camera, Oxford
  { lat: 52.204, lng: 0.1218, country: "United Kingdom", difficulty: "hard" }, // King's College Chapel, Cambridge
  { lat: 54.5973, lng: -5.9301, country: "United Kingdom", difficulty: "hard" }, // City Hall, Belfast

  // Italy
  { lat: 41.8902, lng: 12.4922, country: "Italy", difficulty: "easy" }, // Colosseum, Rome
  { lat: 41.9009, lng: 12.4833, country: "Italy", difficulty: "easy" }, // Trevi Fountain, Rome
  { lat: 43.7696, lng: 11.2558, country: "Italy", difficulty: "easy" }, // Duomo, Florence
  { lat: 45.434, lng: 12.338, country: "Italy", difficulty: "easy" }, // St. Mark's Square, Venice (paved path)
  { lat: 45.4642, lng: 9.19, country: "Italy", difficulty: "medium" }, // Duomo di Milano, Milan
  { lat: 40.8518, lng: 14.2681, country: "Italy", difficulty: "medium" }, // Piazza del Plebiscito, Naples
  { lat: 45.0703, lng: 7.6869, country: "Italy", difficulty: "hard" }, // Piazza Castello, Turin
  { lat: 38.1157, lng: 13.3615, country: "Italy", difficulty: "hard" }, // Palermo Cathedral, Palermo

  // Germany
  { lat: 52.5163, lng: 13.3777, country: "Germany", difficulty: "easy" }, // Brandenburg Gate, Berlin
  { lat: 48.1351, lng: 11.582, country: "Germany", difficulty: "easy" }, // Marienplatz, Munich
  { lat: 53.5511, lng: 9.9937, country: "Germany", difficulty: "medium" }, // Jungfernstieg, Hamburg
  { lat: 50.1109, lng: 8.6821, country: "Germany", difficulty: "medium" }, // Romerberg, Frankfurt
  { lat: 50.9413, lng: 6.9583, country: "Germany", difficulty: "easy" }, // Cologne Cathedral, Cologne
  { lat: 48.7758, lng: 9.1829, country: "Germany", difficulty: "hard" }, // Schlossplatz, Stuttgart
  { lat: 51.0504, lng: 13.7373, country: "Germany", difficulty: "hard" }, // Zwinger, Dresden

  // Spain
  { lat: 40.4168, lng: -3.7038, country: "Spain", difficulty: "easy" }, // Puerta del Sol, Madrid
  { lat: 41.4036, lng: 2.1744, country: "Spain", difficulty: "easy" }, // Sagrada Familia, Barcelona
  { lat: 37.3891, lng: -5.9845, country: "Spain", difficulty: "medium" }, // Plaza de España, Seville
  { lat: 39.4699, lng: -0.3763, country: "Spain", difficulty: "medium" }, // City of Arts and Sciences, Valencia
  { lat: 43.263, lng: -2.935, country: "Spain", difficulty: "hard" }, // Guggenheim Museum, Bilbao
  { lat: 36.7213, lng: -4.4214, country: "Spain", difficulty: "hard" }, // Calle Larios, Malaga

  // Norway
  { lat: 59.9139, lng: 10.7522, country: "Norway", difficulty: "easy" }, // Karl Johans Gate, Oslo
  { lat: 60.3913, lng: 5.3221, country: "Norway", difficulty: "medium" }, // Bryggen, Bergen
  { lat: 69.6492, lng: 18.9553, country: "Norway", difficulty: "hard" }, // Tromso Harbor, Tromso
  { lat: 62.1015, lng: 7.2066, country: "Norway", difficulty: "hard" }, // Geirangerfjord view point

  // Iceland
  { lat: 64.1466, lng: -21.9426, country: "Iceland", difficulty: "easy" }, // Hallgrimskirkja, Reykjavik
  { lat: 63.4194, lng: -19.006, country: "Iceland", difficulty: "hard" }, // Vik Black Sand Beach view
  { lat: 64.7838, lng: -20.9789, country: "Iceland", difficulty: "hard" }, // Husafell scenic road

  // Netherlands
  { lat: 52.3702, lng: 4.8952, country: "Netherlands", difficulty: "easy" }, // Dam Square, Amsterdam
  { lat: 51.9244, lng: 4.4777, country: "Netherlands", difficulty: "medium" }, // Markthal, Rotterdam
  { lat: 52.0907, lng: 5.1214, country: "Netherlands", difficulty: "hard" }, // Dom Tower, Utrecht

  // Switzerland
  { lat: 47.3769, lng: 8.5417, country: "Switzerland", difficulty: "easy" }, // Bahnhofstrasse, Zurich
  { lat: 46.2044, lng: 6.1432, country: "Switzerland", difficulty: "medium" }, // Jet d'Eau, Geneva
  { lat: 45.9763, lng: 7.6585, country: "Switzerland", difficulty: "hard" }, // Zermatt village (electric car path)

  // Greece
  { lat: 37.9715, lng: 23.7257, country: "Greece", difficulty: "easy" }, // Acropolis, Athens
  { lat: 36.4618, lng: 25.3753, country: "Greece", difficulty: "medium" }, // Oia, Santorini

  // ==================== NORTH AMERICA ====================
  // United States
  { lat: 40.758, lng: -73.9855, country: "United States", difficulty: "easy" }, // Times Square, NY
  {
    lat: 37.8199,
    lng: -122.4783,
    country: "United States",
    difficulty: "easy",
  }, // Golden Gate Bridge, SF
  { lat: 41.8988, lng: -87.6229, country: "United States", difficulty: "easy" }, // Magnificent Mile, Chicago
  { lat: 25.7907, lng: -80.13, country: "United States", difficulty: "easy" }, // Ocean Drive, Miami
  {
    lat: 36.0544,
    lng: -112.1376,
    country: "United States",
    difficulty: "medium",
  }, // Grand Canyon Visitor Center
  { lat: 44.428, lng: -110.5885, country: "United States", difficulty: "hard" }, // Yellowstone Old Faithful
  {
    lat: 47.6062,
    lng: -122.3321,
    country: "United States",
    difficulty: "medium",
  }, // Pike Place Market, Seattle
  {
    lat: 34.0928,
    lng: -118.3287,
    country: "United States",
    difficulty: "easy",
  }, // Walk of Fame, Los Angeles
  {
    lat: 36.1147,
    lng: -115.1728,
    country: "United States",
    difficulty: "easy",
  }, // Las Vegas Strip
  { lat: 38.9072, lng: -77.0369, country: "United States", difficulty: "easy" }, // Lafayette Square, Washington DC
  {
    lat: 30.2672,
    lng: -97.7431,
    country: "United States",
    difficulty: "medium",
  }, // Congress Ave, Austin
  {
    lat: 39.7392,
    lng: -104.9903,
    country: "United States",
    difficulty: "medium",
  }, // Civic Center, Denver
  {
    lat: 45.5152,
    lng: -122.6784,
    country: "United States",
    difficulty: "medium",
  }, // Pioneer Courthouse Square, Portland
  {
    lat: 21.2753,
    lng: -157.8252,
    country: "United States",
    difficulty: "medium",
  }, // Waikiki Beach Walk, Honolulu
  {
    lat: 61.2181,
    lng: -149.9003,
    country: "United States",
    difficulty: "hard",
  }, // Downtown Anchorage, Alaska
  {
    lat: 35.1427,
    lng: -118.5284,
    country: "United States",
    difficulty: "hard",
  }, // Tehachapi Pass Wind Farm road
  {
    lat: 32.7157,
    lng: -117.1611,
    country: "United States",
    difficulty: "medium",
  }, // Gaslamp Quarter, San Diego
  {
    lat: 42.3601,
    lng: -71.0589,
    country: "United States",
    difficulty: "medium",
  }, // Faneuil Hall, Boston
  {
    lat: 39.9526,
    lng: -75.1652,
    country: "United States",
    difficulty: "medium",
  }, // City Hall, Philadelphia
  { lat: 29.9511, lng: -90.0715, country: "United States", difficulty: "easy" }, // Bourbon Street, New Orleans

  // Canada
  { lat: 43.6426, lng: -79.3871, country: "Canada", difficulty: "easy" }, // CN Tower base, Toronto
  { lat: 49.2827, lng: -123.1207, country: "Canada", difficulty: "easy" }, // Robson Street, Vancouver
  { lat: 45.5017, lng: -73.5673, country: "Canada", difficulty: "medium" }, // Place d'Armes, Montreal
  { lat: 51.0447, lng: -114.0719, country: "Canada", difficulty: "medium" }, // Calgary Tower, Calgary
  { lat: 45.4215, lng: -75.6972, country: "Canada", difficulty: "medium" }, // Parliament Hill, Ottawa
  { lat: 46.8139, lng: -71.208, country: "Canada", difficulty: "hard" }, // Old Quebec, Quebec City
  { lat: 53.5461, lng: -113.4938, country: "Canada", difficulty: "hard" }, // Downtown Edmonton

  // Mexico
  { lat: 19.4326, lng: -99.1332, country: "Mexico", difficulty: "easy" }, // Zocalo, Mexico City
  { lat: 21.1619, lng: -86.8515, country: "Mexico", difficulty: "medium" }, // Hotel Zone, Cancun
  { lat: 20.6597, lng: -103.3496, country: "Mexico", difficulty: "hard" }, // Centro Historico, Guadalajara
  { lat: 16.7597, lng: -99.8821, country: "Mexico", difficulty: "hard" }, // Costera Miguel Aleman, Acapulco

  // ==================== SOUTH AMERICA ====================
  // Brazil
  { lat: -22.9519, lng: -43.2105, country: "Brazil", difficulty: "easy" }, // Christ Redeemer, Rio
  { lat: -23.5615, lng: -46.656, country: "Brazil", difficulty: "easy" }, // Avenida Paulista, Sao Paulo
  { lat: -15.7975, lng: -47.8828, country: "Brazil", difficulty: "medium" }, // Three Powers Plaza, Brasilia
  { lat: -12.9714, lng: -38.5014, country: "Brazil", difficulty: "medium" }, // Pelourinho, Salvador
  { lat: -3.7319, lng: -38.5267, country: "Brazil", difficulty: "hard" }, // Iracema Beach, Fortaleza
  { lat: -3.1019, lng: -60.025, country: "Brazil", difficulty: "hard" }, // Amazon Theatre, Manaus
  { lat: -25.429, lng: -49.2671, country: "Brazil", difficulty: "hard" }, // Botanical Garden, Curitiba

  // Argentina
  { lat: -34.6037, lng: -58.3816, country: "Argentina", difficulty: "easy" }, // Obelisco, Buenos Aires
  { lat: -41.1335, lng: -71.3103, country: "Argentina", difficulty: "hard" }, // Civic Center, Bariloche
  { lat: -54.8019, lng: -68.303, country: "Argentina", difficulty: "hard" }, // Ushuaia Sign, Tierra del Fuego
  { lat: -32.8895, lng: -68.8458, country: "Argentina", difficulty: "hard" }, // Plaza Independencia, Mendoza

  // Chile
  { lat: -33.4372, lng: -70.6506, country: "Chile", difficulty: "easy" }, // Plaza de Armas, Santiago
  { lat: -33.0472, lng: -71.6127, country: "Chile", difficulty: "medium" }, // Valparaiso port hills
  { lat: -53.1638, lng: -70.9171, country: "Chile", difficulty: "hard" }, // Plaza de Armas, Punta Arenas

  // Peru
  { lat: -12.0464, lng: -77.0298, country: "Peru", difficulty: "easy" }, // Plaza Mayor, Lima
  { lat: -13.5168, lng: -71.9786, country: "Peru", difficulty: "medium" }, // Plaza de Armas, Cusco
  { lat: -16.3989, lng: -71.5369, country: "Peru", difficulty: "hard" }, // Plaza de Armas, Arequipa

  // Colombia
  { lat: 4.5981, lng: -74.076, country: "Colombia", difficulty: "easy" }, // Plaza de Bolivar, Bogota
  { lat: 6.2442, lng: -75.5698, country: "Colombia", difficulty: "medium" }, // Botero Plaza, Medellin
  { lat: 10.3997, lng: -75.5144, country: "Colombia", difficulty: "hard" }, // Walled City, Cartagena

  // ==================== ASIA ====================
  // Japan
  { lat: 35.6586, lng: 139.7454, country: "Japan", difficulty: "easy" }, // Tokyo Tower, Tokyo
  { lat: 35.6895, lng: 139.6917, country: "Japan", difficulty: "easy" }, // Metropolitan Gov Building, Tokyo
  { lat: 35.0116, lng: 135.7681, country: "Japan", difficulty: "medium" }, // Kyoto Gyoen
  { lat: 34.6937, lng: 135.5023, country: "Japan", difficulty: "medium" }, // Osaka Castle area
  { lat: 43.0621, lng: 141.3544, country: "Japan", difficulty: "medium" }, // Odori Park, Sapporo
  { lat: 34.3976, lng: 132.4594, country: "Japan", difficulty: "hard" }, // Peace Memorial Park, Hiroshima
  { lat: 33.5904, lng: 130.4017, country: "Japan", difficulty: "hard" }, // Tenjin, Fukuoka
  { lat: 35.1815, lng: 136.9066, country: "Japan", difficulty: "hard" }, // Nagoya Castle area
  { lat: 26.2124, lng: 127.6809, country: "Japan", difficulty: "hard" }, // Kokusai Dori, Okinawa

  // South Korea
  { lat: 37.5665, lng: 126.978, country: "South Korea", difficulty: "easy" }, // Seoul City Hall
  { lat: 37.5796, lng: 126.977, country: "South Korea", difficulty: "easy" }, // Gyeongbokgung Palace entrance
  { lat: 35.1796, lng: 129.0756, country: "South Korea", difficulty: "medium" }, // Busan City Hall
  { lat: 33.4996, lng: 126.5312, country: "South Korea", difficulty: "hard" }, // Jeju City Center
  { lat: 37.4563, lng: 126.7052, country: "South Korea", difficulty: "hard" }, // Incheon Chinatown

  // India
  { lat: 27.1751, lng: 78.0421, country: "India", difficulty: "easy" }, // Taj Mahal gate
  { lat: 28.6129, lng: 77.2295, country: "India", difficulty: "easy" }, // India Gate, New Delhi
  { lat: 18.922, lng: 72.8347, country: "India", difficulty: "medium" }, // Gateway of India, Mumbai
  { lat: 12.9716, lng: 77.5946, country: "India", difficulty: "hard" }, // Cubbon Park, Bangalore
  { lat: 26.9124, lng: 75.7873, country: "India", difficulty: "hard" }, // Hawa Mahal road, Jaipur

  // Singapore
  { lat: 1.2868, lng: 103.8545, country: "Singapore", difficulty: "easy" }, // Merlion Park
  { lat: 1.2816, lng: 103.8636, country: "Singapore", difficulty: "easy" }, // Gardens by the Bay
  { lat: 1.3003, lng: 103.8377, country: "Singapore", difficulty: "medium" }, // Orchard Road

  // Thailand
  { lat: 13.7563, lng: 100.5018, country: "Thailand", difficulty: "easy" }, // Giant Swing, Bangkok
  { lat: 7.8881, lng: 98.3975, country: "Thailand", difficulty: "medium" }, // Old Phuket Town
  { lat: 18.7883, lng: 98.9853, country: "Thailand", difficulty: "hard" }, // Tha Phae Gate, Chiang Mai

  // Taiwan
  { lat: 25.033, lng: 121.5654, country: "Taiwan", difficulty: "easy" }, // Taipei 101 Base
  { lat: 25.036, lng: 121.517, country: "Taiwan", difficulty: "medium" }, // Liberty Square, Taipei
  { lat: 22.6273, lng: 120.3014, country: "Taiwan", difficulty: "hard" }, // Central Park, Kaohsiung

  // Indonesia
  { lat: -6.1754, lng: 106.8272, country: "Indonesia", difficulty: "easy" }, // National Monument, Jakarta
  { lat: -8.65, lng: 115.2167, country: "Indonesia", difficulty: "medium" }, // Denpasar Center, Bali
  { lat: -7.7971, lng: 110.3705, country: "Indonesia", difficulty: "hard" }, // Malioboro Road, Yogyakarta

  // ==================== AFRICA ====================
  // South Africa
  { lat: -33.9249, lng: 18.4241, country: "South Africa", difficulty: "easy" }, // City Hall, Cape Town
  {
    lat: -26.2041,
    lng: 28.0473,
    country: "South Africa",
    difficulty: "medium",
  }, // Constitution Hill, Johannesburg
  { lat: -29.8587, lng: 31.0218, country: "South Africa", difficulty: "hard" }, // Golden Mile, Durban
  { lat: -25.7479, lng: 28.2293, country: "South Africa", difficulty: "hard" }, // Union Buildings, Pretoria

  // Egypt
  { lat: 29.9792, lng: 31.1342, country: "Egypt", difficulty: "easy" }, // Pyramids of Giza
  { lat: 30.0444, lng: 31.2357, country: "Egypt", difficulty: "medium" }, // Tahrir Square, Cairo
  { lat: 31.2001, lng: 29.9187, country: "Egypt", difficulty: "hard" }, // Citadel of Qaitbay, Alexandria

  // Morocco
  { lat: 31.6295, lng: -7.9811, country: "Morocco", difficulty: "easy" }, // Bahia Palace, Marrakech
  { lat: 33.5892, lng: -7.6031, country: "Morocco", difficulty: "medium" }, // Hassan II Mosque, Casablanca
  { lat: 34.0209, lng: -6.8416, country: "Morocco", difficulty: "hard" }, // Mausoleum of Mohammed V, Rabat

  // Kenya
  { lat: -1.2921, lng: 36.8219, country: "Kenya", difficulty: "easy" }, // Kenyatta Ave, Nairobi
  { lat: -4.0435, lng: 39.6682, country: "Kenya", difficulty: "hard" }, // Mombasa Tusks, Mombasa

  // ==================== OCEANIA ====================
  // Australia
  { lat: -33.8568, lng: 151.2153, country: "Australia", difficulty: "easy" }, // Opera House, Sydney
  { lat: -33.8732, lng: 151.2069, country: "Australia", difficulty: "easy" }, // Darling Harbour, Sydney
  { lat: -37.8174, lng: 144.9678, country: "Australia", difficulty: "easy" }, // Flinders Street Station, Melbourne
  { lat: -27.4709, lng: 153.0235, country: "Australia", difficulty: "medium" }, // South Bank, Brisbane
  { lat: -31.9505, lng: 115.8605, country: "Australia", difficulty: "medium" }, // St Georges Terrace, Perth
  { lat: -34.9285, lng: 138.6007, country: "Australia", difficulty: "medium" }, // Victoria Square, Adelaide
  { lat: -42.8821, lng: 147.3272, country: "Australia", difficulty: "hard" }, // Salamanca Place, Hobart
  { lat: -35.2809, lng: 149.13, country: "Australia", difficulty: "hard" }, // Parliament House, Canberra
  { lat: -38.6805, lng: 143.1047, country: "Australia", difficulty: "hard" }, // Twelve Apostles lookout road
  { lat: -12.4634, lng: 130.8456, country: "Australia", difficulty: "hard" }, // Mitchell Street, Darwin
  { lat: -31.9961, lng: 115.8844, country: "Australia", difficulty: "hard" }, // Swan River road view, Perth
  { lat: -23.698, lng: 133.8807, country: "Australia", difficulty: "hard" }, // Todd Mall, Alice Springs

  // New Zealand
  { lat: -36.8485, lng: 174.7633, country: "New Zealand", difficulty: "easy" }, // Sky Tower area, Auckland
  {
    lat: -41.2865,
    lng: 174.7762,
    country: "New Zealand",
    difficulty: "medium",
  }, // Cuba Street, Wellington
  {
    lat: -43.5321,
    lng: 172.6362,
    country: "New Zealand",
    difficulty: "medium",
  }, // Cathedral Square, Christchurch
  { lat: -45.0312, lng: 168.6626, country: "New Zealand", difficulty: "hard" }, // Mall Street, Queenstown
  { lat: -38.1368, lng: 176.2497, country: "New Zealand", difficulty: "hard" }, // Whakarewaterwa Geothermal area
  { lat: -37.6878, lng: 176.1651, country: "New Zealand", difficulty: "hard" }, // Mount Maunganui main beach road
];

// Enrich with UUIDs
const enrichedLocations = locations.map((loc) => ({
  id: randomUUID(),
  ...loc,
}));

// Additional coordinates to reach 200+
const secondaryLocations = [
  { lat: 42.3314, lng: -83.0458, country: "United States", difficulty: "hard" },
  {
    lat: 32.7767,
    lng: -96.797,
    country: "United States",
    difficulty: "medium",
  },
  { lat: 33.749, lng: -84.388, country: "United States", difficulty: "medium" },
  {
    lat: 29.7604,
    lng: -95.3698,
    country: "United States",
    difficulty: "medium",
  },
  { lat: 39.2904, lng: -76.6122, country: "United States", difficulty: "hard" },
  { lat: 36.1627, lng: -86.7816, country: "United States", difficulty: "easy" },
  { lat: 33.4484, lng: -112.074, country: "United States", difficulty: "hard" },
  { lat: 38.2527, lng: -85.7585, country: "United States", difficulty: "hard" },
  { lat: 40.4406, lng: -79.9959, country: "United States", difficulty: "hard" },
  { lat: 49.8951, lng: -97.1384, country: "Canada", difficulty: "hard" },
  { lat: 48.4284, lng: -123.3656, country: "Canada", difficulty: "medium" },
  { lat: 47.5615, lng: -52.7126, country: "Canada", difficulty: "hard" },
  {
    lat: 53.4808,
    lng: -2.2426,
    country: "United Kingdom",
    difficulty: "medium",
  },
  { lat: 54.9783, lng: -1.6178, country: "United Kingdom", difficulty: "hard" },
  {
    lat: 50.8225,
    lng: -0.1372,
    country: "United Kingdom",
    difficulty: "medium",
  },
  { lat: 47.2184, lng: -1.5536, country: "France", difficulty: "hard" },
  { lat: 43.6047, lng: 1.4442, country: "France", difficulty: "medium" },
  { lat: 50.6292, lng: 3.0573, country: "France", difficulty: "hard" },
  { lat: 53.0793, lng: 8.8017, country: "Germany", difficulty: "hard" },
  { lat: 50.1211, lng: 8.5447, country: "Germany", difficulty: "hard" },
  { lat: 54.3233, lng: 10.1228, country: "Germany", difficulty: "hard" },
  { lat: 43.7167, lng: 10.4, country: "Italy", difficulty: "easy" },
  { lat: 40.712, lng: 13.9, country: "Italy", difficulty: "hard" },
  { lat: 37.5024, lng: 15.0873, country: "Italy", difficulty: "hard" },
  { lat: 35.1709, lng: 136.8815, country: "Japan", difficulty: "medium" },
  { lat: 35.443, lng: 139.638, country: "Japan", difficulty: "medium" },
  { lat: 43.7706, lng: 142.3648, country: "Japan", difficulty: "hard" },
  { lat: -27.9626, lng: 153.4158, country: "Australia", difficulty: "medium" },
  { lat: -32.9283, lng: 151.7817, country: "Australia", difficulty: "hard" },
  { lat: -19.259, lng: 146.8169, country: "Australia", difficulty: "hard" },
  { lat: -34.9011, lng: -56.1915, country: "Uruguay", difficulty: "medium" },
  { lat: -16.5001, lng: -68.15, country: "Bolivia", difficulty: "hard" },
  { lat: -0.1807, lng: -78.4678, country: "Ecuador", difficulty: "medium" },
  { lat: 50.8503, lng: 4.3517, country: "Belgium", difficulty: "easy" },
  { lat: 51.2094, lng: 3.2247, country: "Belgium", difficulty: "medium" },
  { lat: 48.2082, lng: 16.3738, country: "Austria", difficulty: "easy" },
  { lat: 47.8095, lng: 13.055, country: "Austria", difficulty: "medium" },
  { lat: 59.3293, lng: 18.0686, country: "Sweden", difficulty: "easy" },
  { lat: 57.7089, lng: 11.9746, country: "Sweden", difficulty: "medium" },
  { lat: 55.6761, lng: 12.5683, country: "Denmark", difficulty: "easy" },
  { lat: 50.088, lng: 14.4208, country: "Czech Republic", difficulty: "easy" },
  { lat: 47.4979, lng: 19.0402, country: "Hungary", difficulty: "easy" },
  { lat: 52.2297, lng: 21.0122, country: "Poland", difficulty: "medium" },
  { lat: 50.0647, lng: 19.945, country: "Poland", difficulty: "medium" },
  { lat: 38.7223, lng: -9.1393, country: "Portugal", difficulty: "easy" },
  { lat: 41.1579, lng: -8.6291, country: "Portugal", difficulty: "medium" },
  { lat: 44.4268, lng: 26.1025, country: "Romania", difficulty: "hard" },
  { lat: 41.0082, lng: 28.9784, country: "Turkey", difficulty: "easy" },
  { lat: 39.9334, lng: 32.8597, country: "Turkey", difficulty: "medium" },
  { lat: 38.4192, lng: 27.1287, country: "Turkey", difficulty: "hard" },
  { lat: 35.1558, lng: 33.3613, country: "Cyprus", difficulty: "hard" },
  { lat: 35.9042, lng: 14.5189, country: "Malta", difficulty: "medium" },
  { lat: 22.3964, lng: 114.1095, country: "Hong Kong", difficulty: "easy" },
  { lat: 3.139, lng: 101.6869, country: "Malaysia", difficulty: "easy" },
  { lat: 14.5995, lng: 120.9842, country: "Philippines", difficulty: "medium" },
  { lat: 10.7769, lng: 106.7009, country: "Vietnam", difficulty: "medium" },
  { lat: 21.0285, lng: 105.8542, country: "Vietnam", difficulty: "hard" },
  { lat: 6.9271, lng: 79.8612, country: "Sri Lanka", difficulty: "hard" },
  {
    lat: 25.2048,
    lng: 55.2708,
    country: "United Arab Emirates",
    difficulty: "easy",
  },
  {
    lat: 24.4539,
    lng: 54.3773,
    country: "United Arab Emirates",
    difficulty: "medium",
  },
  { lat: 31.7683, lng: 35.2137, country: "Israel", difficulty: "medium" },
  { lat: 32.0853, lng: 34.7818, country: "Israel", difficulty: "medium" },
];

const enrichedSecondary = secondaryLocations.map((loc) => ({
  id: randomUUID(),
  ...loc,
}));

// Additional extra locations to hit 210 coordinates
const extraLocations = [
  { lat: 45.815, lng: 15.9819, country: "Croatia", difficulty: "medium" },
  { lat: 42.6507, lng: 18.0944, country: "Croatia", difficulty: "easy" },
  { lat: 53.3498, lng: -6.2603, country: "Ireland", difficulty: "easy" },
  { lat: 51.8985, lng: -8.4758, country: "Ireland", difficulty: "medium" },
  { lat: 60.1699, lng: 24.9384, country: "Finland", difficulty: "easy" },
  { lat: 60.4518, lng: 22.2666, country: "Finland", difficulty: "hard" },
  { lat: 59.437, lng: 24.7536, country: "Estonia", difficulty: "medium" },
  { lat: 56.9496, lng: 24.1052, country: "Latvia", difficulty: "medium" },
  { lat: 54.6872, lng: 25.2797, country: "Lithuania", difficulty: "medium" },
  { lat: 48.1486, lng: 17.1077, country: "Slovakia", difficulty: "medium" },
  { lat: 46.5588, lng: 8.5645, country: "Switzerland", difficulty: "hard" },
  { lat: 46.5283, lng: 8.0167, country: "Switzerland", difficulty: "hard" },
  { lat: 40.634, lng: 14.6027, country: "Italy", difficulty: "hard" },
  { lat: 43.8015, lng: 7.7761, country: "Italy", difficulty: "hard" },
  { lat: 47.4116, lng: 0.985, country: "France", difficulty: "hard" },
  { lat: 43.9589, lng: 4.806, country: "France", difficulty: "hard" },
  { lat: 39.5696, lng: 2.6502, country: "Spain", difficulty: "medium" },
  { lat: 28.4682, lng: -16.2546, country: "Spain", difficulty: "hard" },
  {
    lat: 34.2257,
    lng: -118.4682,
    country: "United States",
    difficulty: "hard",
  },
  {
    lat: 36.6002,
    lng: -121.8947,
    country: "United States",
    difficulty: "medium",
  },
  { lat: 35.6128, lng: -83.5186, country: "United States", difficulty: "hard" },
  { lat: 33.8121, lng: -117.919, country: "United States", difficulty: "easy" },
  {
    lat: 28.5383,
    lng: -81.3792,
    country: "United States",
    difficulty: "medium",
  },
  { lat: 44.3386, lng: -68.2733, country: "United States", difficulty: "hard" },
  { lat: 38.627, lng: -90.1994, country: "United States", difficulty: "easy" },
  {
    lat: 39.0997,
    lng: -94.5786,
    country: "United States",
    difficulty: "medium",
  },
  { lat: 35.4676, lng: -97.5164, country: "United States", difficulty: "hard" },
  {
    lat: 40.7608,
    lng: -111.891,
    country: "United States",
    difficulty: "medium",
  },
  {
    lat: 20.8783,
    lng: -156.6825,
    country: "United States",
    difficulty: "hard",
  },
  { lat: 43.0389, lng: -87.9065, country: "United States", difficulty: "hard" },
  { lat: 36.5613, lng: 136.6562, country: "Japan", difficulty: "hard" },
  { lat: 34.6851, lng: 135.1955, country: "Japan", difficulty: "medium" },
  { lat: 33.8392, lng: 132.7656, country: "Japan", difficulty: "hard" },
  { lat: 41.7687, lng: 140.7288, country: "Japan", difficulty: "hard" },
  { lat: 36.3659, lng: 140.4711, country: "Japan", difficulty: "hard" },
  { lat: -27.5701, lng: -153.0701, country: "Australia", difficulty: "hard" },
  { lat: -33.8915, lng: 151.2767, country: "Australia", difficulty: "easy" },
  { lat: -33.7128, lng: 150.3119, country: "Australia", difficulty: "medium" },
  { lat: -32.598, lng: 115.7214, country: "Australia", difficulty: "hard" },
  {
    lat: -33.9189,
    lng: 18.4233,
    country: "South Africa",
    difficulty: "medium",
  },
  { lat: -23.0012, lng: -43.3501, country: "Brazil", difficulty: "hard" },
  { lat: -23.5489, lng: -46.6388, country: "Brazil", difficulty: "medium" },
  { lat: -34.5826, lng: -58.4211, country: "Argentina", difficulty: "medium" },
  { lat: -32.9468, lng: -60.6393, country: "Argentina", difficulty: "hard" },
  { lat: 13.7278, lng: 100.5241, country: "Thailand", difficulty: "medium" },
  { lat: 18.7902, lng: 98.9745, country: "Thailand", difficulty: "hard" },
  { lat: 3.1466, lng: 101.6984, country: "Malaysia", difficulty: "medium" },
  { lat: 5.4143, lng: 100.3295, country: "Malaysia", difficulty: "hard" },
  { lat: 1.3521, lng: 103.8198, country: "Singapore", difficulty: "medium" },
  { lat: 25.0421, lng: 121.5082, country: "Taiwan", difficulty: "easy" },
  { lat: 24.0817, lng: 120.6861, country: "Taiwan", difficulty: "hard" },
  { lat: 52.3676, lng: 4.9041, country: "Netherlands", difficulty: "easy" },
  { lat: 51.2198, lng: 4.4025, country: "Belgium", difficulty: "medium" },
  { lat: 48.21, lng: 16.363, country: "Austria", difficulty: "easy" },
  { lat: 59.3262, lng: 17.9875, country: "Sweden", difficulty: "hard" },
  { lat: 55.6794, lng: 12.5925, country: "Denmark", difficulty: "easy" },
  { lat: 50.0803, lng: 14.4028, country: "Czech Republic", difficulty: "easy" },
  { lat: 37.9838, lng: 23.7275, country: "Greece", difficulty: "easy" },
];

const enrichedExtra = extraLocations.map((loc) => ({
  id: randomUUID(),
  ...loc,
}));

const allLocations = [
  ...enrichedLocations,
  ...enrichedSecondary,
  ...enrichedExtra,
];
console.log(`Generated ${allLocations.length} locations.`);

const outputFilePath = path.join(__dirname, "location_seed.json");
fs.writeFileSync(outputFilePath, JSON.stringify(allLocations, null, 2));
console.log(`Saved to ${outputFilePath}`);
