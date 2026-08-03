import 'package:flutter/foundation.dart';

import '../models/destination.dart';
import '../services/api_service.dart';

/// État applicatif global : destinations, favoris, visités, notes.
class AppProvider extends ChangeNotifier {
  final ApiService _api;

  AppProvider({ApiService? api}) : _api = api ?? ApiService.instance;

  List<Destination> _destinations = [];
  List<Destination> _recommendations = [];
  List<String> _visited = [];
  Map<String, dynamic> _favoriteNotes = {};
  bool _loading = false;
  String? _error;

  List<Destination> get destinations => _destinations;
  List<Destination> get recommendations => _recommendations;
  List<String> get visited => _visited;
  Map<String, dynamic> get favoriteNotes => _favoriteNotes;
  bool get loading => _loading;
  String? get error => _error;

  bool isVisited(String destinationName) => _visited.contains(destinationName);

  Future<void> loadDestinations({
    String query = '',
    String tag = '',
    String city = '',
    String category = '',
    num? maxCost,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _destinations = await _api.getDestinations(
        query: query,
        tag: tag,
        city: city,
        category: category,
        maxCost: maxCost,
      );
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadRecommendations({int limit = 10}) async {
    try {
      _recommendations = await _api.getRecommendations(limit: limit);
    } catch (e) {
      _recommendations = [];
    }
    notifyListeners();
  }

  Future<void> loadVisited() async {
    try {
      _visited = await _api.getVisited();
    } catch (e) {
      _visited = [];
    }
    notifyListeners();
  }

  Future<void> loadFavoriteNotes() async {
    try {
      final notes = await _api.getFavoriteNotes();
      _favoriteNotes = notes.map((key, value) => MapEntry(key, value));
    } catch (e) {
      _favoriteNotes = {};
    }
    notifyListeners();
  }

  Future<void> toggleVisited(Destination destination) async {
    if (_visited.contains(destination.name)) {
      _visited.remove(destination.name);
      await _api.unmarkVisited(destination.name);
    } else {
      _visited.add(destination.name);
      await _api.markVisited(destination.name);
    }
    notifyListeners();
  }

  Future<void> saveNote(
    Destination destination,
    Map<String, dynamic> note,
  ) async {
    _favoriteNotes[destination.name] = note;
    notifyListeners();
  }

  Future<void> removeNote(String destinationName) async {
    _favoriteNotes.remove(destinationName);
    await _api.deleteFavoriteNote(destinationName);
    notifyListeners();
  }
}
