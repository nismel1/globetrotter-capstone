/// Modèle utilisateur — profil stocké côté client après connexion.
class UserProfile {
  final String username;
  final List<String> preferences;
  final String avatar;
  final bool isAdmin;

  UserProfile({
    required this.username,
    this.preferences = const [],
    this.avatar = '',
    this.isAdmin = false,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      username: (json['username'] ?? '').toString(),
      preferences:
          (json['preferences'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      avatar: (json['avatar'] ?? '').toString(),
      isAdmin: (json['username'] ?? '').toString() == 'admin',
    );
  }

  Map<String, dynamic> toJson() => {
    'username': username,
    'preferences': preferences,
    'avatar': avatar,
  };

  UserProfile copyWith({
    String? username,
    List<String>? preferences,
    String? avatar,
    bool? isAdmin,
  }) {
    return UserProfile(
      username: username ?? this.username,
      preferences: preferences ?? this.preferences,
      avatar: avatar ?? this.avatar,
      isAdmin: isAdmin ?? this.isAdmin,
    );
  }
}
