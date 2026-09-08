import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/Common/ConfirmDialog';

const ConfirmContext = createContext(null);

/**
 * Globalny confirm() — Promise<boolean>, do podmiany systemowego Alert.alert
 * przy pytaniach „czy na pewno?”.
 */
export function ConfirmProvider({ children }) {
	const [dialog, setDialog] = useState(null);
	const resolverRef = useRef(null);

	const finish = useCallback((result) => {
		const resolve = resolverRef.current;
		resolverRef.current = null;
		setDialog(null);
		resolve?.(result);
	}, []);

	const confirm = useCallback((options = {}) => {
		return new Promise((resolve) => {
			resolverRef.current?.(false);
			resolverRef.current = resolve;
			setDialog({
				title: options.title ?? '',
				message: options.message ?? '',
				cancelLabel: options.cancelLabel ?? 'Anuluj',
				confirmLabel: options.confirmLabel ?? 'Potwierdź',
				destructive: options.destructive !== false,
			});
		});
	}, []);

	const value = useMemo(() => confirm, [confirm]);

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			<ConfirmDialog
				visible={dialog != null}
				title={dialog?.title}
				message={dialog?.message}
				cancelLabel={dialog?.cancelLabel}
				confirmLabel={dialog?.confirmLabel}
				destructive={dialog?.destructive}
				onCancel={() => finish(false)}
				onConfirm={() => finish(true)}
			/>
		</ConfirmContext.Provider>
	);
}

export function useConfirm() {
	const confirm = useContext(ConfirmContext);
	if (!confirm) {
		throw new Error('useConfirm musi być użyty wewnątrz ConfirmProvider');
	}
	return confirm;
}
