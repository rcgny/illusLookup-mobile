import { useEffect, useRef } from 'react';
import {
	BackHandler,
	Keyboard,
	Pressable,
	StyleProp,
	StyleSheet,
	Text,
	TextInput,
	View,
	ViewStyle,
} from 'react-native';

type TopicComboBoxProps = {
	value: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	isOpen: boolean;
	onToggle: () => void;
	onRequestClose: () => void;
	onToggleFromZone?: () => void;
	options: string[];
	onSelectOption: (topic: string) => void;
	showClear: boolean;
	onClear: () => void;
	showOpenZone: boolean;
	emptyMessage: string;
	hintMessage?: string;
	containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared topic combo-box UI used by Home/Create/Edit/Delete screens.
 *
 * Phase 2.5.2 Step 1:
 * - Centralizes combo rendering and interaction behavior.
 * - Preserves Phase 2.5.1 tap rules and typing-based search opening.
 *
 * Phase 2.5.3:
 * - Closes on outside taps when dropdown is open.
 * - Closes on Android back and keyboard dismiss before leaving the screen.
 */
export function TopicComboBox({
	value,
	onChangeText,
	placeholder,
	isOpen,
	onToggle,
	onRequestClose,
	onToggleFromZone,
	options,
	onSelectOption,
	showClear,
	onClear,
	showOpenZone,
	emptyMessage,
	hintMessage,
	containerStyle,
}: TopicComboBoxProps) {
	const comboInputRef = useRef<TextInput | null>(null);

	// Phase 2.7 Step 6: Do not auto-focus on open to avoid Android soft-keyboard popups.
	// Users can still tap into the input directly when they want to type.

	useEffect(() => {
		if (!isOpen) return;

		const onBack = () => {
			onRequestClose();
			return true;
		};

		const backSub = BackHandler.addEventListener('hardwareBackPress', onBack);
		const keyboardSub = Keyboard.addListener('keyboardDidHide', () => {
			onRequestClose();
		});

		return () => {
			backSub.remove();
			keyboardSub.remove();
		};
	}, [isOpen, onRequestClose]);

	return (
		<View style={containerStyle}>
			{isOpen && (
				<Pressable style={styles.outsideTapOverlay} onPress={onRequestClose} />
			)}
			<View style={styles.comboInput}>
				<TextInput
					ref={comboInputRef}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					style={styles.comboTextInput}
					autoCapitalize="none"
					autoCorrect={false}
				/>
				{showOpenZone && (
					<Pressable
						style={styles.comboInputOpenZone}
						onPress={onToggleFromZone ?? onToggle}
					/>
				)}
				<View style={styles.comboInputActions}>
					{showClear && (
						<Pressable onPress={onClear} style={styles.iconButton} hitSlop={8}>
							<Text style={styles.iconButtonText}>X</Text>
						</Pressable>
					)}
					<Pressable onPress={onToggle} hitSlop={8}>
						<Text style={styles.comboChevron}>{isOpen ? '▲' : '▼'}</Text>
					</Pressable>
				</View>
			</View>

			{isOpen && (
				<View style={styles.comboDropdown}>
					{options.length === 0 ? (
						<Text style={styles.comboEmpty}>{emptyMessage}</Text>
					) : (
						// Developer note: keep dropdown rows non-virtualized here.
						// This shared component is used inside Create's outer ScrollView,
						// and using FlatList would trigger React Native's
						// "VirtualizedLists should never be nested inside plain ScrollViews"
						// warning when opening the combo.
						<View style={styles.comboList}>
							{options.map((item) => (
								<Pressable
									key={item}
									style={styles.comboOption}
									onPress={() => onSelectOption(item)}
								>
									<Text style={styles.comboOptionText}>{item}</Text>
								</Pressable>
							))}
						</View>
					)}
					{!!hintMessage && <Text style={styles.comboHint}>{hintMessage}</Text>}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	comboInput: {
		zIndex: 2,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	comboTextInput: {
		flex: 1,
		fontSize: 16,
		color: '#111827',
	},
	comboInputOpenZone: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 96,
		right: 30,
	},
	comboInputActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	comboChevron: {
		fontSize: 12,
		color: '#374151',
	},
	iconButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f8fafc',
	},
	iconButtonText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#334155',
	},
	comboDropdown: {
		zIndex: 2,
		marginTop: 8,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#d1d5db',
		overflow: 'hidden',
	},
	comboList: {
		maxHeight: 264,
	},
	comboOption: {
		paddingHorizontal: 12,
		paddingVertical: 11,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	comboOptionText: {
		fontSize: 15,
		color: '#111827',
	},
	comboEmpty: {
		paddingHorizontal: 12,
		paddingVertical: 14,
		fontSize: 14,
		color: '#6b7280',
	},
	comboHint: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 13,
		color: '#6b7280',
		fontStyle: 'italic',
	},
	outsideTapOverlay: {
		position: 'absolute',
		top: -2000,
		bottom: -2000,
		left: -2000,
		right: -2000,
		zIndex: 1,
	},
});
