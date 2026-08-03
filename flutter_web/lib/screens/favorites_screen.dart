import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../models/review.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import '../widgets/destination_card.dart';
import 'destination_detail_screen.dart';

/// Écran Favoris & Visités — onglets + notes personnelles.
class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  bool _showVisited = false;
  List<Destination> _destinations = [];
  Map<String, FavoriteNote> _notes = {};
  bool _loading = true;
  String? _error;

  Destination? _noteTarget;
  bool _showNoteDialog = false;
  final _noteCtrl = TextEditingController();
  final _visitDateCtrl = TextEditingController();
  final _companionsCtrl = TextEditingController();
  final _budgetCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    _visitDateCtrl.dispose();
    _companionsCtrl.dispose();
    _budgetCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = ApiService.instance;
    try {
      final allDestinations = await api.getDestinations();
      Map<String, FavoriteNote> notes = {};
      try {
        notes = await api.getFavoriteNotes();
      } catch (_) {}
      final visitedNames = _showVisited ? await api.getVisited() : <String>[];
      final displayNames = _showVisited ? visitedNames : notes.keys.toList();
      final filtered = allDestinations
          .where((d) => displayNames.contains(d.name))
          .toList();
      if (mounted) {
        setState(() {
          _destinations = filtered;
          _notes = notes;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  void _openNote(Destination dest) async {
    setState(() {
      _noteTarget = dest;
      _showNoteDialog = true;
      _noteCtrl.clear();
      _visitDateCtrl.clear();
      _companionsCtrl.clear();
      _budgetCtrl.clear();
    });

    try {
      final note = await ApiService.instance.getFavoriteNote(dest.name);
      if (note != null && mounted) {
        _noteCtrl.text = note.note;
        _visitDateCtrl.text = note.visitDate;
        _companionsCtrl.text = note.companions;
        _budgetCtrl.text = note.budget?.toString() ?? '';
        setState(() {});
      }
    } catch (_) {}
  }

  Future<void> _saveNote() async {
    final target = _noteTarget;
    if (target == null) return;
    final note = FavoriteNote(
      note: _noteCtrl.text.trim(),
      visitDate: _visitDateCtrl.text.trim(),
      companions: _companionsCtrl.text.trim(),
      budget: double.tryParse(_budgetCtrl.text.trim()),
    );
    await ApiService.instance.saveFavoriteNote(target.name, note);
    setState(() {
      _notes[target.name] = note;
      _showNoteDialog = false;
    });
  }

  Future<void> _removeFavorite(Destination dest) async {
    await ApiService.instance.deleteFavoriteNote(dest.name);
    setState(() => _notes.remove(dest.name));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            Expanded(child: _buildBody(context)),
          ],
        ),
        if (_showNoteDialog) _buildNoteDialog(context),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.vertForet, AppColors.vertGabon],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _showVisited
                  ? 'Vos voyages accomplis'
                  : 'Votre collection d\'envies',
              style: AppTextStyles.displayMedium(color: AppColors.ivoire),
            ),
            const SizedBox(height: 6),
            Text(
              _showVisited
                  ? 'Revivez vos aventures et partagez vos expériences'
                  : 'Les lieux gardés de côté deviennent la base de vos prochains itinéraires',
              style: AppTextStyles.bodyMedium(
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: _TabButton(
                    label: 'Favoris',
                    icon: Icons.favorite,
                    active: !_showVisited,
                    onTap: () {
                      setState(() => _showVisited = false);
                      _load();
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _TabButton(
                    label: 'Visités',
                    icon: Icons.check_circle,
                    active: _showVisited,
                    onTap: () {
                      setState(() => _showVisited = true);
                      _load();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);

    if (_destinations.isEmpty) {
      return EmptyState(
        icon: _showVisited ? Icons.map_outlined : Icons.favorite_border,
        title: _showVisited
            ? 'Aucune destination visitée'
            : 'Aucun favori pour le moment',
        message: _showVisited
            ? 'Marquez les destinations que vous avez visitées'
            : 'Ajoutez des destinations depuis l\'accueil ou l\'explorer',
      );
    }

    final width = MediaQuery.of(context).size.width;
    final columns = width > 1000
        ? 3
        : width > 600
        ? 2
        : 1;
    return GridView.builder(
      padding: const EdgeInsets.all(AppSpacing.xl),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: AppSpacing.lg,
        crossAxisSpacing: AppSpacing.lg,
        childAspectRatio: columns == 1 ? 1.5 : 0.8,
      ),
      itemCount: _destinations.length,
      itemBuilder: (context, index) {
        final dest = _destinations[index];
        final note = _notes[dest.name];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: DestinationCard(
                destination: dest,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => DestinationDetailScreen(destination: dest),
                  ),
                ),
              ),
            ),
            if (!_showVisited) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () => _openNote(dest),
                    icon: Icon(
                      note != null ? Icons.edit_note : Icons.note_add,
                      size: 18,
                      color: AppColors.vertGabon,
                    ),
                    label: Text(
                      note != null ? 'Modifier la note' : 'Ajouter une note',
                      style: AppTextStyles.labelSmall(
                        color: AppColors.vertGabon,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _removeFavorite(dest),
                    icon: const Icon(
                      Icons.delete_outline,
                      color: AppColors.textMuted,
                    ),
                    tooltip: 'Retirer des favoris',
                  ),
                ],
              ),
              if (note != null && note.hasContent)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.brumeVerte,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.notes,
                        size: 16,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          note.note,
                          style: AppTextStyles.bodySmall(
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        );
      },
    );
  }

  Widget _buildNoteDialog(BuildContext context) {
    final dest = _noteTarget;
    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.5),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: GestureDetector(
          onTap: () => setState(() => _showNoteDialog = false),
          child: Container(
            width: 480,
            constraints: const BoxConstraints(maxHeight: 600),
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.xl),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Note personnelle',
                        style: AppTextStyles.displaySmall(),
                      ),
                      IconButton(
                        onPressed: () =>
                            setState(() => _showNoteDialog = false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  if (dest != null)
                    Text(
                      dest.fullName,
                      style: AppTextStyles.bodyMedium(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  const SizedBox(height: AppSpacing.lg),
                  Text('Vos notes', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _noteCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText:
                          'Ex: Je veux absolument voir le coucher de soleil…',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Date de visite souhaitée',
                    style: AppTextStyles.labelMedium(),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _visitDateCtrl,
                    decoration: const InputDecoration(hintText: 'Ex: Été 2025'),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Avec qui ?', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _companionsCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Ex: En famille, entre amis…',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Budget prévu (FCFA)',
                    style: AppTextStyles.labelMedium(),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _budgetCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: 'Ex: 20000'),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saveNote,
                      child: const Text('Sauvegarder'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        decoration: BoxDecoration(
          color: active ? AppColors.ivoire : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: active
                ? AppColors.ivoire
                : Colors.white.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: active ? AppColors.vertGabon : AppColors.ivoire,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTextStyles.labelMedium(
                color: active ? AppColors.vertGabon : AppColors.ivoire,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
