from odoo import models, fields

class ResPartner(models.Model):
    _inherit = 'res.partner'

    tin_number = fields.Char(string="TIN No")
    specific_location = fields.Char(string="Specific Location")

    tin_certificate = fields.Binary(string="TIN Certificate")
    business_license = fields.Binary(string="Business License")
    business_registration = fields.Binary(string="Business Registration")
    vat_certificate = fields.Binary(string="VAT Certificate")
    national_id = fields.Binary(string="National ID Card of Manager or Delegate")
    delegation_letter = fields.Binary(string="Documents Authentication and Registration Delegation Letter")