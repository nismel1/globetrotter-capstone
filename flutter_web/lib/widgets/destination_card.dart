import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/destination.dart';

/// Carte destination réutilisable (image, nom, catégorie, note).
class DestinationCard extends StatelessWidget {
  final Destination destination;
  final VoidCallback? onTap;
  final bool showMatchScore;
  final double? width;
  final double? height;

  const DestinationCard({
    super.key,
    required this.destination,
    this.onTap,
    this.showMatchScore = false,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isWide = width != null && width! > 260;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          boxShadow: appShadow(),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              destination.image,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                color: AppColors.brumeVerte,
                child: const Icon(
                  Icons.place,
                  size: 48,
                  color: AppColors.vertGabon,
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.75),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 12,
              left: 12,
              child: Row(
                children: [
                  _Badge(
                    label: destination.category.toUpperCase(),
                    color: AppColors.jauneGabon,
                  ),
                  if (showMatchScore && destination.matchScore > 0) ...[
                    const SizedBox(width: 6),
                    _Badge(
                      label: 'Match ${destination.matchScore}',
                      color: AppColors.bleuGabon,
                    ),
                  ],
                ],
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    destination.fullName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.labelLarge(color: AppColors.ivoire),
                  ),
                  if (isWide) ...[
                    const SizedBox(height: 4),
                    Text(
                      destination.city.isNotEmpty
                          ? destination.city
                          : destination.country,
                      style: AppTextStyles.bodySmall(
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 16,
                        color: AppColors.jauneGabon,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        destination.rating.toStringAsFixed(1),
                        style: AppTextStyles.labelMedium(
                          color: AppColors.ivoire,
                        ),
                      ),
                      if (destination.priceLabel.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          destination.priceLabel,
                          style: AppTextStyles.bodySmall(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label,
        style: AppTextStyles.labelSmall(color: AppColors.noirProfond),
      ),
    );
  }
}
