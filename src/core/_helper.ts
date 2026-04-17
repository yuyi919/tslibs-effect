import type { Branded } from "effect/Brand";

const emptyProto = Object.getPrototypeOf({});

export const setProtoUnsafe = (o: any, proto: any): any => {
	const source = Object.getPrototypeOf(o);
	return Object.setPrototypeOf(
		o,
		source === emptyProto || source === proto
			? source
			: setProtoUnsafe(source, proto),
	);
};

export const deepSetPrototype = <T, B>(o: T, proto: B): T & B => {
	return setProtoUnsafe(o, proto);
};

export const getDeepPropertiesDescriptors = <B>(
	classInstance: B,
): ReturnType<typeof Object.getOwnPropertyDescriptors<B>> => {
	const deep = Object.getPrototypeOf(classInstance);
	if (deep === emptyProto || !deep) {
		return Object.getOwnPropertyDescriptors(classInstance);
	}
	return {
		...getDeepPropertiesDescriptors(deep),
		...Object.getOwnPropertyDescriptors(classInstance),
	};
};

export type BrandedError<Name extends string> = Branded<Error, Name>;

export function deepAssignUnsafe<Assignable extends {}, Assign extends {}>(
	o: Assignable,
	classInstance: Assign,
): Assignable &
	(keyof Assign & keyof Assignable extends never
		? Assign
		: Omit<Assign, keyof Assignable>) {
	return Object.defineProperties(
		Object.assign(o, classInstance),
		getDeepPropertiesDescriptors<Assign>(Object.getPrototypeOf(classInstance)),
	) as Assignable & Assign;
}

export function deepAssign<Assignable extends {}, Assign extends {}>(
	o: Assignable,
	classInstance: keyof Assign & keyof Assignable extends never
		? Assign
		: BrandedError<`成员\`${Extract<
				keyof Assign & keyof Assignable,
				string
			>}\`冲突`>,
): Assignable &
	(keyof Assign & keyof Assignable extends never
		? Assign
		: Omit<Assign, keyof Assignable>) {
	return Object.defineProperties(
		Object.assign(o, classInstance),
		getDeepPropertiesDescriptors<Assign>(Object.getPrototypeOf(classInstance)),
	) as Assignable & Assign;
}
export const definePropertiesDeep = <A extends {}, B extends {}>(
	o: A,
	classInstance: B,
): A & B => {
	return Object.defineProperties(
		o,
		getDeepPropertiesDescriptors<B>(classInstance),
	) as A & B;
};

/** https://docs.tsafe.dev/objectKeys */
export function structKeys<T extends Record<string | number, any>>(
	o: T,
): (keyof T)[] {
	return Object.keys(o) as any;
}

export type StructEntries<
	T extends Record<PropertyKey, any>,
	Keys extends keyof T = keyof T,
> = Exclude<
	{
		[key in Keys]: readonly [key, T[key]];
	}[Keys],
	undefined
>;
export function structEntries<T extends Record<PropertyKey, any>>(
	o: T,
): StructEntries<T>[] {
	return [
		...Object.getOwnPropertyNames(o),
		...Object.getOwnPropertySymbols(o),
	].map((key) => [key, o[key]]) as any;
}
