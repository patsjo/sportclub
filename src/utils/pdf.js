import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import JSZip from "jszip";
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

const getPdfDocDefinition = (logo, title, printObjects, pdfSettings = true) => {
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
        header: {},
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
        docDefinition.content.push({
            pageBreak: index > 0 ? 'before' : undefined,
            columns: [
            {
                width: '*',
                alignment: 'left',
                stack: [
                    { text: printObject.header, style: 'header' },
                    ...printObject.inputs.map(input => `${input.label}: ${input.value}`)
                ]
            },
            {
                width: 'auto',
                alignment: 'right',
                stack: [
                    { image: logo, fit: [40, 45] }
                ]
            },
        ]});
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
    return docDefinition;
}

export const getPdf = (proxyurl, logoUrl, title, printObjects, pdfSettings = true) => new Promise((resolve, reject) => {
    getLogo(proxyurl, logoUrl).then(logo => {
        const docDefinition = getPdfDocDefinition(logo, title, printObjects, pdfSettings);

        pdfMake.createPdf(docDefinition).download(`${title}.pdf`);
        resolve();
    }).catch(error => reject(error));
});

const getBase64 = (pdfDocument) => {
    return new Promise((resolve) => {
        pdfDocument.getBase64((data) => {
            resolve(data);
        });
    })
}

export const getZip = (proxyurl, logoUrl, title, printObjects, pdfSettings) => new Promise((resolve, reject) => {
    getLogo(proxyurl, logoUrl).then(async logo => {
        var zip = new JSZip();
 
        for (const printObject of printObjects) {
            const docDefinition = getPdfDocDefinition(logo, title, [printObject], pdfSettings);
            const data = await getBase64(pdfMake.createPdf(docDefinition));
            zip.file(`${printObject.header}.pdf`, data, {base64: true});
        }
        
        zip.generateAsync({type:"blob", compression: "DEFLATE", mimeType: 'application/zip'}).then(blob => {
            const link = document.createElement('a');
            link.download = `${title}.zip`;
            link.href = URL.createObjectURL(blob);
            link.click();
            resolve();
        });
    }).catch(error => reject(error));
});