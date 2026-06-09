import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  priceMin: number;
  priceMax: number;
  propertyTypes: string[];
  amenities: string[];
}

export const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose, onApply }) => {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const styles = makeStyles(colors, height);
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(500);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const propertyTypes = ['House', 'Apartment', 'Villa', 'Hotel', 'Resort'];
  const amenities = ['Pool', 'WiFi', 'Kitchen', 'Parking', 'AC', 'Gym', 'Beach', 'Pet-friendly'];

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleApply = () => {
    onApply({
      location,
      checkIn,
      checkOut,
      adults,
      children,
      priceMin,
      priceMax,
      propertyTypes: selectedTypes,
      amenities: selectedAmenities,
    });
    onClose();
  };

  const handleClear = () => {
    setLocation('');
    setCheckIn('');
    setCheckOut('');
    setAdults(2);
    setChildren(0);
    setPriceMin(0);
    setPriceMax(500);
    setSelectedTypes([]);
    setSelectedAmenities([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Find your stay</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Location */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Where</Text>
              <TextInput
                style={styles.input}
                placeholder="Search destinations"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Dates */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>When</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="Check-in"
                  placeholderTextColor={colors.textSecondary}
                  value={checkIn}
                  onChangeText={setCheckIn}
                />
                <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="Check-out"
                  placeholderTextColor={colors.textSecondary}
                  value={checkOut}
                  onChangeText={setCheckOut}
                />
              </View>
            </View>

            {/* Guests */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Who</Text>
              <View style={styles.guestRow}>
                <View style={styles.guestItem}>
                  <Text style={styles.guestLabel}>Adults</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => setAdults(Math.max(1, adults - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{adults}</Text>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => setAdults(adults + 1)}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.guestItem}>
                  <Text style={styles.guestLabel}>Children</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => setChildren(Math.max(0, children - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{children}</Text>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => setChildren(children + 1)}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceSymbol}>$</Text>
                  <TextInput
                    style={styles.priceValue}
                    value={priceMin.toString()}
                    onChangeText={(text) => setPriceMin(parseInt(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.priceSeparator}>to</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.priceSymbol}>$</Text>
                  <TextInput
                    style={styles.priceValue}
                    value={priceMax.toString()}
                    onChangeText={(text) => setPriceMax(parseInt(text) || 500)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Property Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Property Type</Text>
              <View style={styles.chipContainer}>
                {propertyTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      selectedTypes.includes(type) && styles.chipActive,
                    ]}
                    onPress={() => toggleType(type)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedTypes.includes(type) && styles.chipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amenities */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Amenities</Text>
              <View style={styles.chipContainer}>
                {amenities.map((amenity) => (
                  <TouchableOpacity
                    key={amenity}
                    style={[
                      styles.chip,
                      selectedAmenities.includes(amenity) && styles.chipActive,
                    ]}
                    onPress={() => toggleAmenity(amenity)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedAmenities.includes(amenity) && styles.chipTextActive,
                      ]}
                    >
                      {amenity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function makeStyles(colors: any, height: number) {
  return StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: height * 0.9,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: 20,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  filterSection: {
    marginTop: spacing.xl,
  },
  filterLabel: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 15,
    ...fonts.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateInput: {
    flex: 1,
  },
  guestRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  guestItem: {
    flex: 1,
  },
  guestLabel: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  counterValue: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  priceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  priceSymbol: {
    fontSize: 15,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  priceValue: {
    flex: 1,
    fontSize: 15,
    ...fonts.regular,
    color: colors.textPrimary,
  },
  priceSeparator: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  clearButton: {
    flex: 1,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textInverse,
  },
  });
}
