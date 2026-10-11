
const IntrinsicTypeError = TypeError;
const IntrinsicObject = Object;

const isObject = (val: unknown): boolean => IntrinsicObject(val) === val;

const assignEverything = (() => {
  const ownKeys = Reflect.ownKeys;
  const get = Reflect.get;
  const defineProperty = Reflect.defineProperty;

  return <R extends object, G extends object>(left: R, right: G, enumerable: boolean = true): R & G => {
    if (!isObject(left)) {
      throw new IntrinsicTypeError('left is not an object');
    }
    if (!isObject(right)) {
      throw new IntrinsicTypeError('right is not an object');
    }

    // this can throw.
    const keys = ownKeys(right);

    const ret = left as { [key: string | symbol]: unknown };

    // deliberate indexed loop to resist prototype modifications
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      // this can throw.
      const val = get(right, key);

      // this can throw.
      const success = defineProperty(ret, key, {
        __proto__: null,
        value: val,
        enumerable,
      } as PropertyDescriptor);

      if (!success) {
        throw new IntrinsicTypeError("Property definition failed");
      }
    }

    return ret as unknown as R & G;
  };
})();

const IntrinsicReflect: typeof Reflect = Object.freeze(assignEverything(Object.create(null), Reflect));

const buildThrowingArgs = (sentinel: symbol): unknown[] => {
  return {
    get length() {
      throw sentinel;
    },
  } as unknown as unknown[];
};

const IS_CALLABLE_SENTINEL: unique symbol = Symbol('IS_CALLABLE_SENTINEL');

type ApplyFunc<T, A, R> = (this: T, ... args: A[]) => R;

const isCallable = (val: unknown): boolean => {
  try {
    IntrinsicReflect.apply(
      val as ApplyFunc<undefined, unknown, unknown>,
      undefined,
      buildThrowingArgs(IS_CALLABLE_SENTINEL),
    );
  } catch (e) {
    return e === IS_CALLABLE_SENTINEL;
  }
  return false;
};

const IS_CONSTRUCTOR_SENTINEL: unique symbol = Symbol('IS_CONSTRUCTOR_SENTINEL');

const isConstructor = (val: unknown): boolean => {
  try {
    IntrinsicReflect.construct(val as new () => unknown, buildThrowingArgs(IS_CONSTRUCTOR_SENTINEL));
  } catch (e) {
    return e === IS_CONSTRUCTOR_SENTINEL;
  }
  return false;
};

const intrinsicIsArray = Array.isArray;

const hasRevokedProxyInChain = (value: unknown): boolean => {
  try {
    intrinsicIsArray(value);
    return false;
  } catch {
    return true;
  }
};

const intrinsicSameValue = Object.is;
const intrinsicSymbolKeyFor = Symbol.keyFor;
const intrinsicSymbolFor = Symbol.for;

const isPrimitive = (value: unknown): boolean => !isObject(value);
const sameValue = intrinsicSameValue;

const toBoolean = (value: unknown): boolean => !!value;

// The assertion affects TypeScript only; unary + performs ToNumber.
const toNumber = (value: unknown): number => +(value as number);

const toString = (value: unknown): string => `${value}`;

const toInt32 = (value: unknown): number => (value as number) | 0;
const toUint32 = (value: unknown): number => (value as number) >>> 0;

const requireObjectCoercible = (value: unknown): void => {
  if (value === null || value === undefined) {
    throw new IntrinsicTypeError("Value is null or undefined");
  }
};

const toObject = (value: unknown): object => {
  requireObjectCoercible(value);
  return IntrinsicObject(value);
};

const toPropertyKey = (value: unknown): string | symbol =>
  IntrinsicReflect.ownKeys({
    __proto__: null,
    [value as PropertyKey]: undefined,
  })[0]!;

const canBeHeldWeakly = (value: unknown): boolean =>
  isObject(value) ||
  (
    typeof value === "symbol" &&
    intrinsicSymbolKeyFor(value) === undefined
  );

const intrinsicObjectCreate = Object.create;
const intrinsicObjectFreeze = Object.freeze;

interface Spiegel {
  /**
   * `Symbol.for('dad582c7-ec0a-4b47-90fd-809e86e21259')`
   */
  readonly ID: symbol,

  /**
   * Test if a value has a `[[Call]]` internal method.
   * This does not mean that calling it does not throw.
   * This is a reliable alternative to `typeof val == 'function'`.
   * @param val value to test.
   * @returns true if it has `[[Call]]`.
   */
  readonly isCallable: (val: unknown) => boolean;

  /**
   * Test if a value has a `[[Construct]]` internal method.
   * This does not mean that it is actually constructible.
   * @param val value to test.
   * @returns true if it has `[[Construct]]`.
   */
  readonly isConstructor: (val: unknown) => boolean;

  /**
   * Test if a value is an object.
   * @param val value to test.
   * @returns true it is an object (including revoked proxies and functions). false on nulls.
   */
  readonly isObject: (val: unknown) => boolean;

  /**
   * Test if a value contains a revoked proxy in the proxy target chain.
   * @param val value to test.
   * @returns true if it has a revoked proxy in the proxy target chain.
   */
  readonly hasRevokedProxyInChain: (val: unknown) => boolean;

  /**
   * Test if a value is an array (`Array.isArray`)
   * @param val value to test.
   * @returns true if it is an array
   * @throws an error on a revoked proxy.
   */
  readonly isArray: (val: unknown) => boolean;

  /**
   * Inverse of `isObject`.
   * @param val value to test.
   * @returns true it it is primitive.
   */
  readonly isPrimitive: (val: unknown) => boolean;

  /**
   * Alias of `Object.is`
   * @param val1 value to test for equity.
   * @param val2 value to test for equity.
   * @returns true if both values are the same.
   */
  readonly sameValue: (val1: unknown, val2: unknown) => boolean;

  /**
   * Convert a value to a boolean.
   * @param val value to convert.
   * @returns false for falsy values, true otherwise.
   */
  readonly toBoolean: (val: unknown) => boolean;

  /**
   * Convert a value to a signed 32-bit integer.
   * @param val value to convert.
   * @returns the converted integer, or zero for NaN, infinities and zero.
   * @throws if numeric conversion fails, including for symbols and bigints.
   */
  readonly toInt32: (val: unknown) => number;

  /**
   * Convert a value to a number using unary +.
   * @param val value to convert.
   * @returns the converted number.
   * @throws if numeric conversion fails, including for symbols and bigints.
   */
  readonly toNumber: (val: unknown) => number;

  /**
   * Convert a primitive to its wrapper object, or return an object unchanged.
   * @param val value to convert.
   * @returns the converted object.
   * @throws TypeError if the value is null or undefined.
   */
  readonly toObject: (val: unknown) => object;

  /**
   * Convert a value to a property key using the string primitive-conversion hint.
   * @param val value to convert.
   * @returns a symbol or string suitable for use as a property key.
   * @throws if primitive or string conversion fails.
   */
  readonly toPropertyKey: (val: unknown) => string | symbol;

  /**
   * Convert a value to a string using template literal interpolation.
   * @param val value to convert.
   * @returns the converted string.
   * @throws if string conversion fails, including for symbols.
   */
  readonly toString: (val: unknown) => string;

  /**
   * Convert a value to an unsigned 32-bit integer.
   * @param val value to convert.
   * @returns the converted integer, or zero for NaN, infinities and zero.
   * @throws if numeric conversion fails, including for symbols and bigints.
   */
  readonly toUint32: (val: unknown) => number;

  /**
   * Test if a value can be held weakly.
   * @param val value to test.
   * @returns true for objects and symbols not registered with Symbol.for.
   */
  readonly canBeHeldWeakly: (val: unknown) => boolean;

  /**
   * Alias of Object.freeze. Freezes an object's own properties without freezing nested objects.
   * @param o value to freeze.
   * @returns the same value, frozen if it is an object.
   * @throws if the object cannot be frozen.
   */
  readonly freezeObject: typeof Object.freeze;

  /**
   * Create an object with the given prototype and no own properties.
   * @param proto prototype of the new object, or null.
   * @returns the new object.
   * @throws TypeError if the prototype is neither an object nor null.
   */
  readonly createObject: (proto: object | null) => object;
}

const Spiegel: Spiegel = Object.freeze(assignEverything(Object.create(null), {
  ID: intrinsicSymbolFor('dad582c7-ec0a-4b47-90fd-809e86e21259'),
  isCallable,
  isConstructor,
  isObject,
  hasRevokedProxyInChain,
  isArray: intrinsicIsArray,
  isPrimitive,
  sameValue,
  toBoolean,
  toInt32,
  toNumber,
  toObject,
  toPropertyKey,
  toString,
  toUint32,
  canBeHeldWeakly,
  freezeObject: intrinsicObjectFreeze,
  createObject: (proto: object | null): object => intrinsicObjectCreate(proto),
}, false));

export default Spiegel;

export {
  Spiegel,
};
