import { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import { pdfExporter } from "quill-to-pdf";
import * as quillToWord from "quill-to-word";
import "../../styles/Export.css";

// function for the export component
const Export = ({ quillRef, titleRef }) => {

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        // function to handle clicks outside the dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        // add event listener for clicks outside the dropdown
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside); // remove listener
        };
    }, []);
    
    // function to toggle the dropdown menu
    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    // function to export the document as a PDF
    const exportPDF = async () => {
        // check if quillRef is available
        if (!quillRef.current) {
            alert("Editor not ready");
            return;
        }
        
        // check if the PDF exporter is available
        try {
            const delta = quillRef.current.getContents(); // get the contents of the quill editor
            const pdfBlob = await pdfExporter.generatePdf(delta); // generate the PDF blob using pdfExporter from quill-to-pdf
            const pdfFileName = titleRef.current ? `${titleRef.current}.pdf` : "document.pdf"; // set the file name to titleRef
            saveAs(pdfBlob, pdfFileName); // save the PDF blob as a file
        } catch (error) {
            console.error("Error exporting PDF:", error);
            alert("Failed to export PDF. Please try again.");
        }
    };

    // function to export the document as a DOCX file
    const exportDOCX = async () => {
        // check if quillRef is available
        if (!quillRef.current) {
            alert("Editor not ready");
            return;
        }

        // check if the DOCX exporter is available
        try {
            const delta = quillRef.current.getContents(); // get the contents of the quill editor
            const docxBlob = await quillToWord.generateWord(delta, { exportAs: "blob" }); // generate the DOCX blob using quill-to-word from quill-to-word
            const docxFileName = titleRef.current ? `${titleRef.current}.docx` : "document.docx"; // set the file name to titleRef
            saveAs(docxBlob, docxFileName); // save the DOCX blob as a file
        } catch (error) {
            console.error("Error exporting DOCX:", error);
            alert("Failed to export DOCX. Please try again.");
        }
    };

    return (
        <div className="export-dropdown-container" ref={dropdownRef}>

            {/* button to toggle the dropdown menu */}
            <button className="export-main-button" onClick={toggleDropdown}>Export</button>
            
            {/* dropdown menu for export options */}
            {showDropdown && (
                <div className="export-dropdown-menu">
                    <button className="export-option" onClick={exportPDF}>Export to PDF</button>
                    <button className="export-option" onClick={exportDOCX}>Export to Word</button>
                </div>
            )}
        </div>
    );
};

// export the component for use
export default Export;