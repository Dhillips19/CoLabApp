import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Export from '../../../src/components/Editor/Export';
import { saveAs } from 'file-saver';
import { pdfExporter } from 'quill-to-pdf';
import * as quillToWord from 'quill-to-word';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('file-saver');
jest.mock('quill-to-pdf', () => ({
  pdfExporter: {
    generatePdf: jest.fn()
  }
}));

jest.mock('quill-to-word', () => ({
  generateWord: jest.fn()
}));

describe('Export Component', () => {
  const mockQuillRef = {
    current: {
      getContents: jest.fn().mockReturnValue({ ops: [{ insert: 'Test document content' }] })
    }
  };
  
  const mockTitleRef = { current: 'Test Document' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Element.prototype.scrollIntoView for dropdown positioning
    Element.prototype.scrollIntoView = jest.fn();
  });

  test('renders the export button', () => {
    render(<Export quillRef={mockQuillRef} titleRef={mockTitleRef} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeInTheDocument();
  });

  test('shows dropdown menu when button is clicked', async () => {
    render(<Export quillRef={mockQuillRef} titleRef={mockTitleRef} />);
    
    const user = userEvent.setup();
    const exportButton = screen.getByRole('button', { name: /export/i });
    
    await user.click(exportButton);
    
    expect(screen.getByRole('button', { name: /export to pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export to word/i })).toBeInTheDocument();
  });

  test('closes dropdown when clicking outside', async () => {
    // Create a parent element to simulate clicking outside the dropdown
    const { container } = render(
      <div>
        <div data-testid="outside-element"></div>
        <Export quillRef={mockQuillRef} titleRef={mockTitleRef} />
      </div>
    );
    
    const user = userEvent.setup();
    
    // Open dropdown
    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('button', { name: /export to pdf/i })).toBeInTheDocument();
    
    // Click outside
    await user.click(screen.getByTestId('outside-element'));
    
    // Dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /export to pdf/i })).not.toBeInTheDocument();
    });
  });

  test('exports to PDF when PDF option is clicked', async () => {
    const pdfBlob = new Blob(['fake pdf content'], { type: 'application/pdf' });
    pdfExporter.generatePdf.mockResolvedValueOnce(pdfBlob);
    
    render(<Export quillRef={mockQuillRef} titleRef={mockTitleRef} />);
    
    const user = userEvent.setup();
    
    // Open dropdown
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    // Click PDF export option
    await user.click(screen.getByRole('button', { name: /export to pdf/i }));
    
    // Check that PDF was generated with correct content
    expect(pdfExporter.generatePdf).toHaveBeenCalledWith(mockQuillRef.current.getContents());
    
    // Check that file was saved with correct name
    await waitFor(() => {
      expect(saveAs).toHaveBeenCalledWith(pdfBlob, 'Test Document.pdf');
    });
  });

  test('exports to Word when Word option is clicked', async () => {
    const docxBlob = new Blob(['fake docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    quillToWord.generateWord.mockResolvedValueOnce(docxBlob);
    
    render(<Export quillRef={mockQuillRef} titleRef={mockTitleRef} />);
    
    const user = userEvent.setup();
    
    // Open dropdown
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    // Click Word export option
    await user.click(screen.getByRole('button', { name: /export to word/i }));
    
    // Check that Word doc was generated with correct content
    expect(quillToWord.generateWord).toHaveBeenCalledWith(
      mockQuillRef.current.getContents(),
      { exportAs: "blob" }
    );
    
    // Check that file was saved with correct name
    await waitFor(() => {
      expect(saveAs).toHaveBeenCalledWith(docxBlob, 'Test Document.docx');
    });
  });

  test('shows alert when quill editor is not ready', async () => {
    // Mock null quillRef to simulate editor not ready
    const emptyQuillRef = { current: null };
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<Export quillRef={emptyQuillRef} titleRef={mockTitleRef} />);
    
    const user = userEvent.setup();
    
    // Open dropdown
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    // Click export options
    await user.click(screen.getByRole('button', { name: /export to pdf/i }));
    
    // Verify alert
    expect(window.alert).toHaveBeenCalledWith('Editor not ready');
    
    // Restore alert
    window.alert.mockRestore();
  });

  test('uses default filename when title is not available', async () => {
    const pdfBlob = new Blob(['fake pdf content'], { type: 'application/pdf' });
    pdfExporter.generatePdf.mockResolvedValueOnce(pdfBlob);
    
    // Use a ref without a current value
    const emptyTitleRef = { current: null };
    
    render(<Export quillRef={mockQuillRef} titleRef={emptyTitleRef} />);
    
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('button', { name: /export to pdf/i }));
    
    await waitFor(() => {
      expect(saveAs).toHaveBeenCalledWith(pdfBlob, 'document.pdf');
    });
  });

  test('handles export errors gracefully', async () => {
    // Mock an error during export
    pdfExporter.generatePdf.mockRejectedValueOnce(new Error('Export failed'));
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<Export quillRef={mockQuillRef} titleRef={mockTitleRef} />);
    
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('button', { name: /export to pdf/i }));
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to export PDF. Please try again.');
    });
    
    window.alert.mockRestore();
  });
});