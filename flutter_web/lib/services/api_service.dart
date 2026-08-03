import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/destination.dart';
import '../models/itinerary.dart';
import '../models/proposal.dart';
import '../models/review.dart';
import '../models/user.dart';

/// Exception métier renvoyée par l'API.
class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, [this.statusCode = 0]);

  @override
  String toString() => message;
}

/// Client API Globetrotter.
///
/// Toutes les méthodes gèrent automatiquement le header Authorization Bearer
/// à partir du token JWT stocké dans SharedPreferences.
class ApiService {
  final String baseUrl;
  final http.Client _client;
  String? _token;
  String? _username;

  static final ApiService instance = ApiService(baseUrl: AppConfig.apiBaseUrl);

  ApiService({required this.baseUrl, http.Client? client})
    : _client = client ?? http.Client();

  // -------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------

  String? get token => _token;
  String? get username => _username;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  bool get isAdmin => _username == 'admin';

  Future<void> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    _username = prefs.getString('username');
  }

  Future<void> saveSession(String token, String username) async {
    _token = token;
    _username = username;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('username', username);
  }

  Future<void> clearSession() async {
    _token = null;
    _username = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('username');
  }

  // -------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------

  Map<String, String> _headers({bool auth = true, bool json = true}) {
    final headers = <String, String>{'Accept': 'application/json'};
    if (json) headers['Content-Type'] = 'application/json';
    if (auth && _token != null) headers['Authorization'] = 'Bearer $_token';
    return headers;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = baseUrl.replaceAll(RegExp(r'/$'), '');
    final uri = Uri.parse('$base$path');
    if (query != null && query.isNotEmpty) {
      return uri.replace(queryParameters: query);
    }
    return uri;
  }

  Future<dynamic> _get(
    String path, {
    Map<String, String>? query,
    bool auth = true,
  }) async {
    final response = await _client.get(
      _uri(path, query),
      headers: _headers(auth: auth),
    );
    _checkError(response);
    return jsonDecode(response.body);
  }

  Future<dynamic> _post(
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final response = await _client.post(
      _uri(path),
      headers: _headers(auth: auth),
      body: body != null ? jsonEncode(body) : null,
    );
    _checkError(response);
    return jsonDecode(response.body);
  }

  Future<dynamic> _put(
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final response = await _client.put(
      _uri(path),
      headers: _headers(auth: auth),
      body: body != null ? jsonEncode(body) : null,
    );
    _checkError(response);
    return jsonDecode(response.body);
  }

  Future<dynamic> _delete(String path, {bool auth = true}) async {
    final response = await _client.delete(
      _uri(path),
      headers: _headers(auth: auth),
    );
    _checkError(response);
    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }

  void _checkError(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    String message;
    try {
      final body = jsonDecode(response.body);
      message = body['error'] ?? 'Erreur ${response.statusCode}';
    } catch (_) {
      message = 'Erreur ${response.statusCode}';
    }
    throw ApiException(message, response.statusCode);
  }

  // -------------------------------------------------------------------
  // AUTH
  // -------------------------------------------------------------------

  Future<UserProfile> login(String username, String password) async {
    final data = await _post(
      '/login',
      body: {'username': username, 'password': password},
      auth: false,
    );
    final token = data['token'] as String;
    await saveSession(token, username);
    return UserProfile(username: username, isAdmin: username == 'admin');
  }

  Future<UserProfile> register(
    String username,
    String password, {
    List<String> preferences = const [],
  }) async {
    await _post(
      '/register',
      body: {
        'username': username,
        'password': password,
        'preferences': preferences,
      },
      auth: false,
    );
    // On login automatiquement après l'inscription pour obtenir un vrai JWT
    return login(username, password);
  }

  Future<UserProfile> adminLogin(String username, String password) async {
    final data = await _post(
      '/admin/login',
      body: {'username': username, 'password': password},
      auth: false,
    );
    final token = data['token'] as String;
    await saveSession(token, username);
    return UserProfile(username: username, isAdmin: true);
  }

  // -------------------------------------------------------------------
  // PROFILE
  // -------------------------------------------------------------------

  Future<UserProfile> updateProfile({
    List<String>? preferences,
    String? avatar,
    String? password,
  }) async {
    final body = <String, dynamic>{};
    if (preferences != null) body['preferences'] = preferences;
    if (avatar != null) body['avatar'] = avatar;
    if (password != null) body['password'] = password;
    final data = await _put('/profile', body: body);
    return UserProfile.fromJson(data);
  }

  // -------------------------------------------------------------------
  // DESTINATIONS
  // -------------------------------------------------------------------

  Future<List<Destination>> getDestinations({
    String query = '',
    String tag = '',
    String city = '',
    String continent = '',
    String category = '',
    num? maxCost,
  }) async {
    final params = <String, String>{};
    if (query.isNotEmpty) params['q'] = query;
    if (tag.isNotEmpty) params['tag'] = tag;
    if (city.isNotEmpty) params['city'] = city;
    if (continent.isNotEmpty) params['continent'] = continent;
    if (category.isNotEmpty) params['category'] = category;
    if (maxCost != null) params['max_cost'] = maxCost.toStringAsFixed(0);

    final data = await _get(
      '/destinations',
      query: params.isNotEmpty ? params : null,
      auth: false,
    );
    return (data as List)
        .map((e) => Destination.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // -------------------------------------------------------------------
  // RECOMMENDATIONS
  // -------------------------------------------------------------------

  Future<List<Destination>> getRecommendations({int limit = 5}) async {
    final data = await _get(
      '/recommendations',
      query: {'limit': limit.toString()},
    );
    return (data as List)
        .map((e) => Destination.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // -------------------------------------------------------------------
  // ITINERARIES
  // -------------------------------------------------------------------

  Future<List<Itinerary>> getItineraries() async {
    final data = await _get('/itineraries');
    return (data as List)
        .map((e) => Itinerary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Itinerary> createItinerary({
    required String title,
    List<String> destinations = const [],
    String startDate = '',
    String endDate = '',
    String notes = '',
  }) async {
    final data = await _post(
      '/itineraries',
      body: {
        'title': title,
        'destinations': destinations,
        'start_date': startDate,
        'end_date': endDate,
        'notes': notes,
      },
    );
    return Itinerary.fromJson(data as Map<String, dynamic>);
  }

  Future<void> updateItinerary(
    String id, {
    String? title,
    List<String>? destinations,
    String? startDate,
    String? endDate,
    String? notes,
  }) async {
    final body = <String, dynamic>{};
    if (title != null) body['title'] = title;
    if (destinations != null) body['destinations'] = destinations;
    if (startDate != null) body['start_date'] = startDate;
    if (endDate != null) body['end_date'] = endDate;
    if (notes != null) body['notes'] = notes;
    await _put('/itineraries/$id', body: body);
  }

  Future<void> deleteItinerary(String id) async {
    await _delete('/itineraries/$id');
  }

  // -------------------------------------------------------------------
  // REVIEWS
  // -------------------------------------------------------------------

  Future<List<Review>> getReviews({String? destinationName}) async {
    final params = destinationName != null
        ? {'destination': destinationName}
        : null;
    final data = await _get('/reviews', query: params, auth: false);
    return (data as List)
        .map((e) => Review.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Review> createReview({
    required String destinationName,
    required double rating,
    required String comment,
  }) async {
    final data = await _post(
      '/reviews',
      body: {
        'destination_name': destinationName,
        'rating': rating,
        'comment': comment,
      },
    );
    return Review.fromJson(data as Map<String, dynamic>);
  }

  // -------------------------------------------------------------------
  // VISITED
  // -------------------------------------------------------------------

  Future<List<String>> getVisited() async {
    final data = await _get('/visited');
    return (data as List).map((e) => e.toString()).toList();
  }

  Future<void> markVisited(String destinationName) async {
    await _post('/visited', body: {'destination_name': destinationName});
  }

  Future<void> unmarkVisited(String destinationName) async {
    await _delete('/visited/$destinationName');
  }

  // -------------------------------------------------------------------
  // FAVORITE NOTES
  // -------------------------------------------------------------------

  Future<Map<String, FavoriteNote>> getFavoriteNotes() async {
    final data = await _get('/favorite-notes');
    final result = <String, FavoriteNote>{};
    if (data is Map) {
      data.forEach((key, value) {
        if (value is Map<String, dynamic>) {
          result[key.toString()] = FavoriteNote.fromJson(value);
        }
      });
    }
    return result;
  }

  Future<FavoriteNote?> getFavoriteNote(String destinationName) async {
    try {
      final data = await _get('/favorite-notes/$destinationName');
      if (data is Map<String, dynamic> && data.isNotEmpty) {
        return FavoriteNote.fromJson(data);
      }
    } catch (_) {}
    return null;
  }

  Future<void> saveFavoriteNote(
    String destinationName,
    FavoriteNote note,
  ) async {
    final body = <String, dynamic>{
      'destination_name': destinationName,
      'note': note.note,
    };
    if (note.visitDate.isNotEmpty) body['visit_date'] = note.visitDate;
    if (note.companions.isNotEmpty) body['companions'] = note.companions;
    if (note.budget != null) body['budget'] = note.budget;
    await _post('/favorite-notes', body: body);
  }

  Future<void> deleteFavoriteNote(String destinationName) async {
    await _delete('/favorite-notes/$destinationName');
  }

  // -------------------------------------------------------------------
  // PROPOSALS (user)
  // -------------------------------------------------------------------

  Future<List<Proposal>> getMyProposals() async {
    final data = await _get('/proposals');
    return (data as List)
        .map((e) => Proposal.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> submitProposal({
    required String name,
    required String country,
    required String continent,
    required String description,
    List<String> tags = const [],
    num avgCostPerDay = 0,
    String image = 'placeholder.jpg',
    String city = '',
  }) async {
    await _post(
      '/proposals',
      body: {
        'name': name,
        'country': country,
        'continent': continent,
        'description': description,
        'tags': tags,
        'avg_cost_per_day': avgCostPerDay,
        'image': image,
        'city': city,
      },
    );
  }

  Future<void> deleteProposal(String id) async {
    await _delete('/proposals/$id');
  }

  // -------------------------------------------------------------------
  // ADMIN
  // -------------------------------------------------------------------

  Future<SystemStats> getAdminStats() async {
    final data = await _get('/admin/stats');
    return SystemStats.fromJson(data as Map<String, dynamic>);
  }

  Future<List<Proposal>> getAdminProposals({String? status}) async {
    final params = status != null ? {'status': status} : null;
    final data = await _get('/admin/proposals', query: params);
    return (data as List)
        .map((e) => Proposal.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<UserProfile>> getAdminUsers() async {
    final data = await _get('/admin/users');
    return (data as List)
        .map((e) => UserProfile.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> approveProposal(String id, {String comment = ''}) async {
    await _post('/admin/proposals/$id/approve', body: {'comment': comment});
  }

  Future<void> rejectProposal(
    String id, {
    String comment = 'Please provide more details',
  }) async {
    await _post('/admin/proposals/$id/reject', body: {'comment': comment});
  }

  Future<void> adminAddDestination(Map<String, dynamic> data) async {
    await _post('/admin/destinations', body: data);
  }
}
