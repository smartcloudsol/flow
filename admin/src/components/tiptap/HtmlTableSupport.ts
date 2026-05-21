import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";

export const HtmlTable = Table.configure({
  resizable: false,
  renderWrapper: false,
  lastColumnResizable: false,
  allowTableNodeSelection: false,
});

export const HtmlTableRow = TableRow;

export const HtmlTableCell = TableCell;

export const HtmlTableHeader = TableHeader;

function getDirectChildRows(element: Element): HTMLTableRowElement[] {
  return Array.from(element.children).filter(
    (child): child is HTMLTableRowElement =>
      child.tagName.toLowerCase() === "tr",
  );
}

export function normalizeTableSectionsHtml(html: string): string {
  if (!html || typeof document === "undefined") {
    return html;
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("table").forEach((tableElement) => {
    const rows: HTMLTableRowElement[] = [];

    Array.from(tableElement.children).forEach((child) => {
      const tagName = child.tagName.toLowerCase();

      if (tagName === "thead" || tagName === "tbody") {
        rows.push(...getDirectChildRows(child));
        child.remove();
        return;
      }

      if (tagName === "tr") {
        rows.push(child as HTMLTableRowElement);
        child.remove();
      }
    });

    if (rows.length === 0) {
      return;
    }

    const insertionAnchor =
      Array.from(tableElement.children).find(
        (child) => child.tagName.toLowerCase() === "tfoot",
      ) ?? null;

    const headerRows: HTMLTableRowElement[] = [];
    const bodyRows: HTMLTableRowElement[] = [];
    let reachedBodyRows = false;

    rows.forEach((row) => {
      const isHeaderRow =
        !reachedBodyRows &&
        row.cells.length > 0 &&
        Array.from(row.cells).every(
          (cell) => cell.tagName.toLowerCase() === "th",
        );

      if (isHeaderRow) {
        headerRows.push(row);
        return;
      }

      reachedBodyRows = true;
      bodyRows.push(row);
    });

    if (headerRows.length > 0) {
      const thead = document.createElement("thead");
      headerRows.forEach((row) => thead.appendChild(row));
      tableElement.insertBefore(thead, insertionAnchor);
    }

    if (bodyRows.length > 0) {
      const tbody = document.createElement("tbody");
      bodyRows.forEach((row) => tbody.appendChild(row));
      tableElement.insertBefore(tbody, insertionAnchor);
    }
  });

  return template.innerHTML;
}
