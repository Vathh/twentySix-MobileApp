import { Alert } from 'react-native';

export function notifyH2hGameCancelled(navigation) {
	Alert.alert('Mecz anulowany', 'Administrator anulował ten mecz.', [
		{
			text: 'OK',
			onPress: () => {
				if (navigation?.canGoBack?.()) {
					navigation.goBack();
				}
			},
		},
	]);
}
