/// Modèle Avis (Review) — renvoyé par /reviews.
class Review {
  final String id;
  final String username;
  final String destinationName;
  final double rating;
  final String comment;
  final String createdAt;
  final String updatedAt;

  Review({
    required this.id,
    this.username = '',
    required this.destinationName,
    this.rating = 0,
    this.comment = '',
    this.createdAt = '',
    this.updatedAt = '',
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: (json['id'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      destinationName: (json['destination_name'] ?? '').toString(),
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0,
      comment: (json['comment'] ?? '').toString(),
      createdAt: (json['created_at'] ?? '').toString(),
      updatedAt: (json['updated_at'] ?? '').toString(),
    );
  }
}

/// Modèle Note personnelle sur un favori (favorite-notes).
class FavoriteNote {
  final String note;
  final String visitDate;
  final String companions;
  final double? budget;
  final String updatedAt;

  FavoriteNote({
    this.note = '',
    this.visitDate = '',
    this.companions = '',
    this.budget,
    this.updatedAt = '',
  });

  factory FavoriteNote.fromJson(Map<String, dynamic> json) {
    return FavoriteNote(
      note: (json['note'] ?? '').toString(),
      visitDate: (json['visit_date'] ?? '').toString(),
      companions: (json['companions'] ?? '').toString(),
      budget: json['budget'] is num ? (json['budget'] as num).toDouble() : null,
      updatedAt: (json['updated_at'] ?? '').toString(),
    );
  }

  bool get hasContent => note.isNotEmpty;
}
