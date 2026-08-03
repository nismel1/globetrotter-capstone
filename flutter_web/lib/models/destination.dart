/// Modèle Destination — correspond aux objets renvoyés par GET /destinations.
class Destination {
  final String id;
  final String name;
  final String nameEn;
  final String nameFr;
  final String country;
  final String continent;
  final String city;
  final String description;
  final List<String> tags;
  final num avgCostPerDay;
  final String priceLabel;
  final String image;
  final double rating;
  final int reviewsCount;
  final String category;
  final Map<String, dynamic>? location;
  final String openingHours;
  final String phone;
  final String website;
  final Map<String, dynamic>? estimatedPrices;
  final Map<String, dynamic>? transportRoutes;
  final String recommendedRoute;
  final String fieldExcursion;
  final List<String> events;
  final int matchScore;

  Destination({
    required this.id,
    required this.name,
    this.nameEn = '',
    this.nameFr = '',
    required this.country,
    this.continent = 'Afrique',
    this.city = '',
    this.description = '',
    this.tags = const [],
    this.avgCostPerDay = 0,
    this.priceLabel = '',
    this.image = '',
    this.rating = 0,
    this.reviewsCount = 0,
    this.category = '',
    this.location,
    this.openingHours = '',
    this.phone = '',
    this.website = '',
    this.estimatedPrices,
    this.transportRoutes,
    this.recommendedRoute = '',
    this.fieldExcursion = '',
    this.events = const [],
    this.matchScore = 0,
  });

  factory Destination.fromJson(Map<String, dynamic> json) {
    final img = (json['image'] ?? '') as String;

    return Destination(
      id: (json['id'] ?? json['name'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      nameEn: (json['name_en'] ?? '').toString(),
      nameFr: (json['name_fr'] ?? '').toString(),
      country: (json['country'] ?? '').toString(),
      continent: (json['continent'] ?? 'Afrique').toString(),
      city: (json['city'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      tags:
          (json['tags'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      avgCostPerDay: json['avg_cost_per_day'] is num
          ? json['avg_cost_per_day'] as num
          : 0,
      priceLabel: (json['price_label'] ?? '').toString(),
      image: _resolveImage(img),
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0,
      reviewsCount: (json['reviews_count'] is num)
          ? (json['reviews_count'] as num).toInt()
          : 0,
      category: (json['category'] ?? '').toString(),
      location: json['location'] is Map<String, dynamic>
          ? json['location'] as Map<String, dynamic>
          : null,
      openingHours: (json['opening_hours'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      website: (json['website'] ?? '').toString(),
      estimatedPrices: json['estimated_prices'] is Map<String, dynamic>
          ? json['estimated_prices'] as Map<String, dynamic>
          : null,
      transportRoutes: json['transport_routes'] is Map<String, dynamic>
          ? json['transport_routes'] as Map<String, dynamic>
          : null,
      recommendedRoute: (json['recommended_route'] ?? '').toString(),
      fieldExcursion: (json['field_excursion'] ?? '').toString(),
      events:
          (json['events'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      matchScore: (json['match_score'] is num)
          ? (json['match_score'] as num).toInt()
          : 0,
    );
  }

static String _resolveImage(String img) {
    if (img.isEmpty) {
      return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
    }
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    // L'API renvoie soit un chemin relatif (/assets/...) soit un nom de fichier
    if (img.startsWith('/assets/')) {
      return 'http://localhost:5000$img';
    }
    // Images locales servies par Flask sous /assets/<image>
    return 'http://localhost:5000/assets/$img';
  }

  String get fullName {
    return name.isEmpty ? nameFr : name;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'country': country,
    'continent': continent,
    'city': city,
    'description': description,
    'tags': tags,
    'avg_cost_per_day': avgCostPerDay,
    'price_label': priceLabel,
    'image': image,
    'rating': rating,
    'reviews_count': reviewsCount,
    'category': category,
  };
}
