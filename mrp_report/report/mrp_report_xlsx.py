from odoo import models
import string
import logging

_logger = logging.getLogger(__name__)

class payrollReportxls(models.AbstractModel):
    _name = 'report.mrp_report.report_mrp_document'
    _inherit = 'report.report_xlsx.abstract'

    def generate_xlsx_report(self, workbook, data, lines):
        # Create a sheet with the title
        sheet = workbook.add_worksheet("PRODUCTION SCHEDULE")
        # _logger.info(f"===================={lines}===================================")
        # _logger.info(f"+++++++++++++++++++{lines.order_ids.no_cut}++++++++++++++++++++")
        
        # Define formats
        header_format = workbook.add_format({'font_size': 12, 'align': 'center', 'bold': True, 'bg_color': '#d3dde3', 'border': True})
        sub_header_format = workbook.add_format({'font_size': 10, 'align': 'center', 'bold': True, 'bg_color': '#d3dde3', 'border': True, 'text_wrap': True})
        title_format = workbook.add_format({'font_size': 14, 'align': 'center', 'bold': True, 'border': True})
        company_format = workbook.add_format({
        'font_size': 16,
        'align': 'center',  # Horizontal centering
        'valign': 'vcenter',  # Vertical centering
        'bold': True,
        'border': False
             })
        normal_format = workbook.add_format({'font_size': 10, 'align': 'left', 'border': True})
        # Insert the image
          # Insert the image and specify its location and size
        sheet.insert_image('A2', '/opt/odoo17/odoo-custom-addons/mrp_report/report/static/img/logo.png', {
            'x_scale': 1,
            'y_scale': 1,
            'positioning': 1,  # Absolute positioning
            'object_position': 1  # Fit image to cells
        })
        # Merge cells for company name and title
        
         # Merge cells for the company name and center the text
        sheet.merge_range('C2:N3', 'Company name: Kite Manufacturing PLC / ካይት ማኑፋክቸሪንግ ኃ/የተ/የግ/ማ', company_format)

         # Merge cells for the title and center the text
        sheet.merge_range('C4:N5', 'Title : Daily Production Schedule', company_format)
        
        # Merge and set the title for the schedule
        sheet.merge_range('C6:N6', 'CORRUGATOR SCHEDULING', company_format)
        # Create a date format for the Excel sheet (e.g., 'dd-mm-yyyy' or another desired format)
        date_format = workbook.add_format({'num_format': 'dd-mm-yyyy', 'align': 'center', 'bold': True, 'valign': 'vcenter', 'font_size': 16})
        for idx, line in enumerate(lines, start=1):
            for order in line.order_ids:  # Loop through order_ids
                # Assuming order.component_group_id.date is a datetime object or string
                date = order.component_group_id.date  
                
                # If it's a string, convert it to a Python datetime object
                if isinstance(date, str):
                    from datetime import datetime
                    date = datetime.strptime(date, '%Y-%m-%d')  # Adjust format as necessary

                date_text = f"Date: {date.strftime('%d-%m-%Y')}"
                # Write the date using the date format
                sheet.merge_range('C7:N7', date_text, date_format)


        # Define the headers with column widths
        headers = [
            ('S/NO', 10),
            ('Batch', 10),
            ('W/O', 10),
            ('Customer Name', 25),
            ('Carton Outer Dimension', 30),  # Merged header
            ('Finished', 20),  # Finished header
            ('Crease', 30),  # Crease header
            ('Flaps', 10),
            ('Flute', 10),
            ('Type', 15),
            ('Trim',15),
            ('Ups',15),
            ('Deckle', 10),
            ('Reel Size', 15),
            ('Material', 15),
            ('Ordered Qty', 15),
            ('Scheduled Qty', 15),
            ('Remains', 10),
            ('No. Cut', 10),
            ('Qty', 10),
            ('Lin Meter', 10),
            ('Print Machine', 15),
            ('Meter Sq. (m²)', 15),
            ('Total (Kg)', 15),
            ('Trim (Kg)', 10)
        ]

        # Write headers to the sheet
        row, col = 7, 0
        for header, width in headers:
            sheet.set_column(col, col, width)  # Set column width
            if header == 'Carton Outer Dimension':
                # Merge cells for the top header
                sheet.merge_range(row, col, row, col + 2, header, header_format)
                # Write sub-headers
                sheet.merge_range(row + 1, col, row + 1, col + 2, 'Finished', sub_header_format)
                sheet.set_column(col, col, 10)
                sheet.write(row + 2, col, 'Length', sub_header_format)
                sheet.write(row + 2, col + 1, 'Width', sub_header_format)
                sheet.write(row + 2, col + 2, 'Height', sub_header_format)
                col += 2  # Move the column index to account for merged columns
            elif header == 'Finished':
                # Separate Finished header
                sheet.merge_range(row, col, row + 1, col + 1, header, sub_header_format)
                sheet.set_column(col, col, 10)
                sheet.write(row + 2, col, 'Sheet Length', sub_header_format)
                sheet.write(row + 2, col + 1, 'Sheet Width', sub_header_format)
                col += 1  # Move the column index to account for merged columns
            elif header == 'Crease':
                # Separate Crease header
                sheet.merge_range(row, col, row + 1, col + 2, header, header_format)
                sheet.set_column(col, col, 10)
                sheet.write(row + 2, col, 'Left', sub_header_format)
                sheet.write(row + 2, col + 1, 'Height', sub_header_format)
                sheet.write(row + 2, col + 2, 'Right', sub_header_format)
                col += 2  # Move the column index to account for merged columns
            else:
                # Write header text with formatting
                sheet.write(row + 2, col, header, sub_header_format)
            col += 1

        sheet.set_column(2, 2, 18)
        sheet.set_column(3, 3, 14)
        row = 10  # Starting the data population from the next row
        for idx, line in enumerate(lines, start=1):
            for order in line.order_ids:  # Loop through order_ids
                remains = order.product_qty - order.scheduled_qty
                # raw_product_names = ', '.join(move.product_id.x_studio_product_des for move in order.move_raw_ids if move.product_id.x_studio_product_des)
                sheet.write(row, 0, idx, normal_format)  # Serial Number (S/NO)
                sheet.write(row, 1, line.reference or '', normal_format)  # Batch
                sheet.write(row, 2, order.name or '', normal_format)  # W/O reference
                sheet.write(row, 3, order.mrp_order_id_1.customer_id.name, normal_format)  # Customer Name
                # Write the carton dimensions
                sheet.write(row, 4, order.length or '', normal_format)  # Length
                sheet.write(row, 5, order.width or '', normal_format)  # Width
                sheet.write(row, 6, order.height or '', normal_format)  # Height
                # Write finished dimensions
                sheet.write(row, 7, order.mrp_order_id_1.chop_length_total, normal_format)  # Sheet Length
                sheet.write(row, 8, order.mrp_order_id_1.deckle_width_total, normal_format)  # Sheet Width
                # Write crease dimensions deckle_width_first
                sheet.write(row, 9, order.mrp_order_id_1.deckle_width_first, normal_format)  # Left
                sheet.write(row, 10, order.mrp_order_id_1.deckle_width_second, normal_format)  # Height
                sheet.write(row, 11, order.mrp_order_id_1.deckle_width_third, normal_format)  # Right
                # Write next dimensions deckle_width_first reel_size
                sheet.write(row, 12, order.mrp_order_id_1.flap, normal_format)  # Flap
                sheet.write(row, 13, order.mrp_order_id_1.style_type_id.flute, normal_format)  # Flute
                sheet.write(row, 14, order.mrp_order_id_1.style_type_id.style, normal_format)  # Style
                sheet.write(row, 15, line.trim_size, normal_format)
                sheet.write(row, 16, order.ups, normal_format)

                sheet.write(row, 17, line.deckle, normal_format)  # Right
                sheet.write(row, 18, line.reel_size, normal_format) 

                sheet.write(row, 19, order.component_group_id.material, normal_format)
                sheet.write(row, 20, order.product_qty, normal_format)
                sheet.write(row, 21, order.scheduled_qty, normal_format)
                sheet.write(row, 22, remains, normal_format)  # Remains

                sheet.write(row, 23, order.no_cut, normal_format)
                sheet.write(row, 24, order.product_qty, normal_format)  # Qty
                sheet.write(row, 25, order.component_group_id.liner_meter, normal_format)
                sheet.write(row, 26, order.print_machine, normal_format)
                sheet.write(row, 27, order.meter_square, normal_format)
                sheet.write(row, 28, order.total_kg, normal_format)
                sheet.write(row, 29, order.component_group_id.trim_kg, normal_format)

                row += 1  # Increment the row for each order

         
        #     # Continue populating other fields similarly for the rest of the headers
        #     row += 1

        # _logger.info(f"Report generated for {len(lines)} mrp.production records.")


    
    # def generate_xlsx_report(self, workbook, data, lines):
    #     print("lines", lines)
    #     _logger.info(f"===================lines===============${lines}")
    #     for line in lines:
    #         _logger.info(f"MRP Production ID: {line.id}")
    #         _logger.info(f"Product: {line.product_id.name}")
    #         _logger.info(f"Quantity: {line.product_qty}")
    #         _logger.info(f"State: {line.state}")
           
    #     format1 = workbook.add_format({'font_size':12, 'align': 'vcenter', 'bold': True, 'bg_color':'#d3dde3', 'color':'black', 'bottom': True, })
    #     format2 = workbook.add_format({'font_size':12, 'align': 'vcenter', 'bold': True, 'bg_color':'#edf4f7', 'color':'black','num_format': '#,##0.00'})
    #     format3 = workbook.add_format({'font_size':11, 'align': 'vcenter', 'bold': False, 'num_format': '#,##0.00'})
    #     format3_colored = workbook.add_format({'font_size':11, 'align': 'vcenter', 'bg_color':'#f7fcff', 'bold': False, 'num_format': '#,##0.00'})
    #     format4 = workbook.add_format({'font_size':12, 'align': 'vcenter', 'bold': True})
    #     format5 = workbook.add_format({'font_size':12, 'align': 'vcenter', 'bold': False})
    #    # sheet = workbook.add_worksheet('Payrlip Report')
        
    #      # Fetch available salary rules:
    #    # _logger.info(f"===================lines===============${lines.slip_ids.stract_id}")
    #     used_structures = []
    #     for sal_structure in lines.slip_ids.struct_id:
    #         if sal_structure.id not in used_structures:
    #             used_structures.append([sal_structure.id,sal_structure.name])
    #     _logger.info(f"===================used stracture===============${used_structures}")
    #     # Logic for each workbook, i.e. group payslips of each salary structure into a separate sheet:
    #     struct_count = 1
    #     for used_struct in used_structures:
    #         # Generate Workbook
    #         sheet = workbook.add_worksheet(str(struct_count)+ ' - ' + str(used_struct[1]) )
    #         cols = list(string.ascii_uppercase) + ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ']
    #         rules = []
    #         col_no = 2
    #         # Fetch available salary rules:
    #         # for item in lines.slip_ids.struct_id.rule_ids:
    #         #     if item.struct_id.id == used_struct[0]:
    #         #         col_title = ''
    #         #         row = [None,None,None,None,None]
    #         #         row[0] = col_no
    #         #         row[1] = item.code
    #         #         row[2] = item.name
    #         #         col_title = str(cols[col_no]) + ':' + str(cols[col_no])
    #         #         row[3] = col_title
    #         #         if len(item.name) < 8:
    #         #             row[4] = 12
    #         #         else:
    #         #             row[4] = len(item.name) + 2
    #         #         rules.append(row)
    #         #         col_no += 1
    #         # print('Salary rules to be considered for structure: ' + used_struct[1])
    #         # print(rules)
            
    #          #Report Details:
    #         for item in lines.slip_ids:
    #             if item.struct_id.id == used_struct[0]:
    #                 batch_period = str(item.date_from.strftime('%B %d, %Y')) + '  To  ' + str(item.date_to.strftime('%B %d, %Y'))
    #                 company_name = item.company_id.name
    #                 break
    #         print(batch_period)
    #         print(company_name)
        
    #         #Company Name
    #         sheet.write(0,0,company_name,format4)
    
    #         sheet.write(0,2,'Payslip Period:',format4)
    #         sheet.write(0,3,batch_period,format5)

    #         sheet.write(1,2,'Payslip Structure:',format4)
    #         sheet.write(1,3,used_struct[1],format5)
       
    #         # List report column headers:
    #         sheet.write(2,0,'Employee Name',format1)
    #         sheet.write(2,1,'Department',format1)
    #         for rule in rules:
    #             sheet.write(2,rule[0],rule[2],format1)

    #         # Generate names, dept, and salary items:
    #         x = 3
    #         e_name = 3
    #         has_payslips = False
    #         for slip in lines.slip_ids:
    #             if lines.slip_ids:
    #                 if slip.struct_id.id == used_struct[0]:
    #                     has_payslips = True
    #                     sheet.write(e_name, 0, slip.employee_id.name, format3)
    #                     sheet.write(e_name, 1, slip.employee_id.department_id.name, format3)
    #                     for line in slip.line_ids:
    #                         for rule in rules:
    #                             if line.code == rule[1]:
    #                                 if line.amount > 0:
    #                                     sheet.write(x, rule[0], line.amount, format3_colored)
    #                                 else:
    #                                     sheet.write(x, rule[0], line.amount, format3)
    #                     x += 1
    #                     e_name += 1
    #         # Generate summission row at report end:
    #         sum_x = e_name
    #         if has_payslips == True:
    #             sheet.write(sum_x,0,'Total',format2)
    #             sheet.write(sum_x,1,'',format2)
    #             for i in range(2,col_no):
    #                 sum_start = cols[i] + '3'
    #                 sum_end = cols[i] + str(sum_x)
    #                 sum_range = '{=SUM(' + str(sum_start) + ':' + sum_end + ')}'
    #                 # print(sum_range)
    #                 sheet.write_formula(sum_x,i,sum_range,format2)
    #                 i += 1
    #         sheet.write(sum_x+2, 1, 'Prepared By', format1)
    #         sheet.write(sum_x+2, 8, 'Checked By', format1)
    #         sheet.write(sum_x+2, 12, 'Approved By', format1)

    #         # set width and height of colmns & rows:
    #         sheet.set_column('A:A',35)
    #         sheet.set_column('B:B',20)
    #         for rule in rules:
    #             sheet.set_column(rule[3],rule[4])
    #         sheet.set_column('C:C',20)
    #         struct_count += 1
        