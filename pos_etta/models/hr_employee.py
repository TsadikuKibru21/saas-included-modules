from odoo import api, models, fields
import logging

_logger = logging.getLogger(__name__)

class HREmployeeInherit(models.Model):
    _inherit = 'hr.employee'
    
    pin = fields.Char(string="PIN", groups="hr.group_hr_user", copy=False, help="PIN used to Check In/Out in the Kiosk Mode of the Attendance application (if enabled in Configuration) and to change the cashier in the Point of Sale application.", required=True)
    is_waiter = fields.Boolean(string='Is Waiter', help='Indicates if the employee is a waiter.')
    is_restaurant_enabled = fields.Boolean(compute='_compute_is_restaurant_enabled')

    def _compute_is_restaurant_enabled(self):
        restaurant_enabled = self.env['pos.config'].search_count([('module_pos_restaurant', '=', True)]) > 0
        for record in self:
            record.is_restaurant_enabled = restaurant_enabled