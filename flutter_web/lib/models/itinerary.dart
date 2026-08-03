/// Modèle Itinéraire — correspond aux objets renvoyés par /itineraries.
class Itinerary {
  final String id;
  final String username;
  final String title;
  final List<String> destinations;
  final String startDate;
  final String endDate;
  final String notes;
  final String createdAt;
  final String updatedAt;

  Itinerary({
    required this.id,
    this.username = '',
    required this.title,
    this.destinations = const [],
    this.startDate = '',
    this.endDate = '',
    this.notes = '',
    this.createdAt = '',
    this.updatedAt = '',
  });

  factory Itinerary.fromJson(Map<String, dynamic> json) {
    return Itinerary(
      id: (json['id'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      destinations:
          (json['destinations'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      startDate: (json['start_date'] ?? '').toString(),
      endDate: (json['end_date'] ?? '').toString(),
      notes: (json['notes'] ?? '').toString(),
      createdAt: (json['created_at'] ?? '').toString(),
      updatedAt: (json['updated_at'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'destinations': destinations,
    'start_date': startDate,
    'end_date': endDate,
    'notes': notes,
  };
}
