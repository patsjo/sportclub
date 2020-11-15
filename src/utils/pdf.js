import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const getLogo = (corsProxy, logoUrl) => new Promise((resolve, reject) => {
    fetch(corsProxy ? `${corsProxy}${encodeURIComponent(logoUrl)}&noJsonConvert=true` : logoUrl)
        .then( response => response.blob() )
        .then( blob => {
            var reader = new FileReader() ;
            reader.onerror = reject;
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(blob) ;
        }) ;
});

const getTableContent = (table) => {
    const contentDefinition = {
        style: 'tableStyle',
        table: {
            headerRows: 1,
            body: []
        },
        layout: 'compactHorizontalLines'
    };
    contentDefinition.table.body.push(
        table.columns.map(col => ({text: col.title, style: 'tableHeader'}))
    );
    table.dataSource.forEach(record => {
        contentDefinition.table.body.push(
            table.columns.map(col => {
                let value = record[col.key];
                if (col.render) {
                    value = col.render(value, record);
                }
                return value;
            })
        );
    });

    return contentDefinition;
}

export const getPdf = (proxyurl, logoUrl, title, printObjects, pdfSettings) => new Promise((resolve, reject) => {
    getLogo(proxyurl, logoUrl).then(logo => {
        const docDefinition = {
            info: {
                title: title,
                author: 'GIK-programmet 4.0',
                subject: title,
                keywords: title
            },
            pageSize: pdfSettings.pageSize,
            pageOrientation: pdfSettings.pageOrientation,
            pageMargins: pdfSettings.pageMargins,
            header: { image: logo, fit: [45, 50], margin: [0, pdfSettings.pageMargins[1], pdfSettings.pageMargins[2], 0], alignment: 'right' },
            content: [],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                tableStyle: {
                    margin: [0, 5, 0, 5]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: 'black'
                }
            },
            defaultStyle: {
                fontSize: 10
            }
        };
        printObjects.forEach((printObject, index) => {
            docDefinition.content.push({ text: printObject.header, style: 'header', pageBreak: index > 0 ? 'before' : undefined });
            printObject.inputs.forEach(input => {
                docDefinition.content.push(`${input.label}: ${input.value}`);
            });
            printObject.tables.forEach(table => {
                docDefinition.content.push(getTableContent(table));
            });
        });
        pdfMake.tableLayouts = {
            compactHorizontalLines: {
              hLineWidth: function (i, node) {
                if (i === 0 || i === node.table.body.length) {
                  return 0;
                }
                return (i === node.table.headerRows) ? 2 : 1;
              },
              vLineWidth: function (i) {
                return 0;
              },
              hLineColor: function (i) {
                return i === 1 ? 'black' : '#aaa';
              },
              paddingLeft: function (i) {
                return i === 0 ? 0 : 3;
              },
              paddingRight: function (i, node) {
                return (i === node.table.widths.length - 1) ? 0 : 3;
              }
            }
          };
        pdfMake.createPdf(docDefinition).download(`${title}.pdf`);
        resolve();
    }).catch(error => reject(error));
});