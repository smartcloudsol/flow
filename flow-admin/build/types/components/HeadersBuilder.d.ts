export interface HeaderEntry {
    key: string;
    value: string;
}
export interface HeadersBuilderProps {
    headers: Record<string, string>;
    onChange: (headers: Record<string, string>) => void;
}
export default function HeadersBuilder({ headers, onChange, }: HeadersBuilderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=HeadersBuilder.d.ts.map