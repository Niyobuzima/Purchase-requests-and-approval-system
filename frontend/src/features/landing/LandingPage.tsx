import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">P2P System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Streamline Your Purchase Process
          </h2>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            A complete procure-to-pay solution that simplifies purchase requests,
            approvals, and order management for your organization.
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <Link to="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-900 text-center mb-12">
            Everything you need to manage purchases
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-xl mb-4">
                  1
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Create Requests
                </h4>
                <p className="text-gray-600">
                  Staff can easily create purchase requests with itemized details,
                  quantities, and pricing information.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-xl mb-4">
                  2
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Multi-Level Approval
                </h4>
                <p className="text-gray-600">
                  Configurable two-level approval workflow ensures proper authorization
                  before purchases are made.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-xl mb-4">
                  3
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Purchase Orders
                </h4>
                <p className="text-gray-600">
                  Automatically generate purchase orders with PDF export
                  once requests are fully approved.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                For Finance Teams
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Upload and validate receipts against purchase orders</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">AI-powered receipt data extraction</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Export reports in CSV and PDF formats</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Spending analytics and dashboards</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                For Administrators
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Manage users and assign roles</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Role-based access control (Staff, Approvers, Finance)</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Real-time notifications for important events</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</span>
                  <span className="text-gray-600">Complete audit trail of all actions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-semibold text-white mb-4">
            Ready to streamline your procurement?
          </h3>
          <p className="text-gray-400 mb-8">
            Get started today and transform how your organization handles purchases.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white border-t">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} P2P System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
