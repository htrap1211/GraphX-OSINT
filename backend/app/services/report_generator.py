"""
PDF Report Generator for OSINT Investigation Cases
Generates professional PDF reports with case details, entities, and statistics
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io
from typing import Dict, List, Any


class ReportGenerator:
    """Generate PDF reports for investigation cases"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        ))
        
        # Subsection style
        self.styles.add(ParagraphStyle(
            name='SubSection',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#374151'),
            spaceAfter=6
        ))
    
    def generate_case_report(self, case_data: Dict, entities: List[Dict], stats: Dict = None) -> bytes:
        """
        Generate a PDF report for a case
        
        Args:
            case_data: Case information (title, description, status, etc.)
            entities: List of entities in the case
            stats: Case statistics (optional)
        
        Returns:
            bytes: PDF file content
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        # Build the document content
        story = []
        
        # Header
        story.extend(self._build_header(case_data))
        
        # Case Overview
        story.extend(self._build_case_overview(case_data))
        
        # Statistics (if available)
        if stats:
            story.extend(self._build_statistics(stats))
        
        # Entities Section
        story.extend(self._build_entities_section(entities))
        
        # Footer
        story.extend(self._build_footer())
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
    
    def _build_header(self, case_data: Dict) -> List:
        """Build report header"""
        elements = []
        
        # Title
        title = Paragraph(
            f"<b>OSINT Investigation Report</b>",
            self.styles['CustomTitle']
        )
        elements.append(title)
        elements.append(Spacer(1, 0.2 * inch))
        
        # Case title
        case_title = Paragraph(
            f"<b>{case_data.get('title', 'Untitled Case')}</b>",
            self.styles['Heading2']
        )
        elements.append(case_title)
        elements.append(Spacer(1, 0.3 * inch))
        
        return elements
    
    def _build_case_overview(self, case_data: Dict) -> List:
        """Build case overview section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Case Overview</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Case details table
        data = [
            ['Case ID:', case_data.get('id', 'N/A')[:8] + '...'],
            ['Status:', case_data.get('status', 'N/A').replace('_', ' ').title()],
            ['Priority:', case_data.get('priority', 'N/A').title()],
            ['Created:', self._format_date(case_data.get('created_at'))],
            ['Updated:', self._format_date(case_data.get('updated_at'))],
            ['Entities:', str(case_data.get('entity_count', 0))],
            ['Jobs:', str(case_data.get('job_count', 0))],
        ]
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))
        
        # Description
        if case_data.get('description'):
            desc_header = Paragraph("<b>Description</b>", self.styles['SubSection'])
            elements.append(desc_header)
            desc = Paragraph(case_data['description'], self.styles['Normal'])
            elements.append(desc)
            elements.append(Spacer(1, 0.2 * inch))
        
        # Tags
        if case_data.get('tags') and len(case_data['tags']) > 0:
            tags_header = Paragraph("<b>Tags</b>", self.styles['SubSection'])
            elements.append(tags_header)
            tags_text = ', '.join(case_data['tags'])
            tags = Paragraph(tags_text, self.styles['Normal'])
            elements.append(tags)
            elements.append(Spacer(1, 0.3 * inch))
        
        return elements
    
    def _build_statistics(self, stats: Dict) -> List:
        """Build statistics section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Case Statistics</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Entity breakdown
        entity_breakdown = stats.get('entity_breakdown', {})
        data = [
            ['Entity Type', 'Count'],
            ['Emails', str(entity_breakdown.get('emails', 0))],
            ['Domains', str(entity_breakdown.get('domains', 0))],
            ['IP Addresses', str(entity_breakdown.get('ips', 0))],
        ]
        
        table = Table(data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))
        
        # Risk breakdown
        risk_breakdown = stats.get('risk_breakdown', {})
        risk_data = [
            ['Risk Level', 'Count'],
            ['High Risk', str(risk_breakdown.get('high', 0))],
            ['Medium Risk', str(risk_breakdown.get('medium', 0))],
            ['Low Risk', str(risk_breakdown.get('low', 0))],
        ]
        
        risk_table = Table(risk_data, colWidths=[3*inch, 2*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        elements.append(risk_table)
        elements.append(Spacer(1, 0.2 * inch))
        
        # Average risk score
        avg_risk = stats.get('average_risk_score', 0)
        risk_text = Paragraph(
            f"<b>Average Risk Score:</b> {avg_risk}/100",
            self.styles['Normal']
        )
        elements.append(risk_text)
        elements.append(Spacer(1, 0.3 * inch))
        
        return elements
    
    def _build_entities_section(self, entities: List[Dict]) -> List:
        """Build entities section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>Case Entities</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        if not entities or len(entities) == 0:
            no_entities = Paragraph("No entities in this case.", self.styles['Normal'])
            elements.append(no_entities)
            return elements
        
        # Group entities by type
        emails = [e for e in entities if e.get('type') == 'Email']
        domains = [e for e in entities if e.get('type') == 'Domain']
        ips = [e for e in entities if e.get('type') == 'IP']
        
        # Emails
        if emails:
            elements.extend(self._build_entity_group('Email Addresses', emails))
        
        # Domains
        if domains:
            elements.extend(self._build_entity_group('Domains', domains))
        
        # IPs
        if ips:
            elements.extend(self._build_entity_group('IP Addresses', ips))
        
        return elements
    
    def _build_entity_group(self, title: str, entities: List[Dict]) -> List:
        """Build a group of entities"""
        elements = []
        
        # Subsection header
        header = Paragraph(f"<b>{title}</b>", self.styles['SubSection'])
        elements.append(header)
        
        # Build table data
        data = [['Entity', 'Risk Score', 'Risk Level']]
        
        for entity in entities:
            props = entity.get('properties', {})
            entity_value = props.get('address') or props.get('name', 'N/A')
            risk_score = props.get('risk_score', 'N/A')
            risk_level = props.get('risk_level', 'N/A')
            
            # Format risk score
            if risk_score != 'N/A':
                risk_score = f"{risk_score}/100"
            
            data.append([entity_value, str(risk_score), str(risk_level)])
        
        # Create table
        table = Table(data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.2 * inch))
        
        return elements
    
    def _build_footer(self) -> List:
        """Build report footer"""
        elements = []
        
        elements.append(Spacer(1, 0.5 * inch))
        
        # Divider
        elements.append(Paragraph("<hr/>", self.styles['Normal']))
        
        # Footer text
        footer_style = ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        
        footer_text = f"Generated by OSINT Intelligence Graph Explorer on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        footer = Paragraph(footer_text, footer_style)
        elements.append(footer)
        
        return elements
    
    def _format_date(self, date_str: str) -> str:
        """Format date string"""
        if not date_str:
            return 'N/A'
        
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M')
        except:
            return str(date_str)


# Global instance
report_generator = ReportGenerator()
