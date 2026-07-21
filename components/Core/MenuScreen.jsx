import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const MenuScreen = ({ navigation }) => {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Menu</Text>
			<Pressable style={styles.item} onPress={() => navigation.navigate('Home')}>
				<Text style={styles.itemText}>Strona główna</Text>
			</Pressable>
			<Pressable style={styles.item} onPress={() => navigation.navigate('Znajomi')}>
				<Text style={styles.itemText}>Znajomi</Text>
			</Pressable>
			<Pressable style={styles.item} onPress={() => navigation.navigate('Zaproszenia')}>
				<Text style={styles.itemText}>Zaproszenia</Text>
			</Pressable>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
	title: { fontSize: 22, color: colors.accent, fontWeight: 'bold', marginBottom: 24 },
	item: {
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: colors.bgElevated,
		borderRadius: 8,
		marginBottom: 12,
	},
	itemText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});

export default MenuScreen;
