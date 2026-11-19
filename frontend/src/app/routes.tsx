import type { RouteObject } from 'react-router';
import { Role } from '@/api/generated/model';
import { AdminHomePage } from '@/features/admin/AdminHomePage';
import { AdminLayout } from '@/features/admin/AdminLayout';
import {
  ADMIN_HOME_PATH,
  ADMIN_ORGANIZATIONS_PATH,
  ADMIN_PRODUCT_CATEGORIES_PATH,
  ADMIN_REGISTRATIONS_PATH,
} from '@/features/admin/adminSections';
import { OrganizationsPage } from '@/features/admin/OrganizationsPage';
import { ProductCategoriesPage } from '@/features/admin/ProductCategoriesPage';
import { RegistrationsPage } from '@/features/admin/RegistrationsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { VERIFY_EMAIL_PATH, VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { CooperativeHomePage } from '@/features/cooperative/CooperativeHomePage';
import { CooperativeLayout } from '@/features/cooperative/CooperativeLayout';
import {
  COOPERATIVE_HOME_PATH,
  COOPERATIVE_PRODUCT_PATH,
  COOPERATIVE_PRODUCTS_PATH,
  COOPERATIVE_PROFILE_PATH,
  COOPERATIVE_REGISTRATION_REQUEST_PATH,
  COOPERATIVE_REGISTRATION_REQUESTS_PATH,
  COOPERATIVE_SECTIONS,
  NEW_PRODUCT_PATH,
  NEW_REGISTRATION_REQUEST_PATH,
} from '@/features/cooperative/cooperativeSections';
import { CorrectRegistrationPage } from '@/features/cooperative/CorrectRegistrationPage';
import { NewRegistrationRequestPage } from '@/features/cooperative/NewRegistrationRequestPage';
import { ProductFormPage } from '@/features/cooperative/ProductFormPage';
import { ProductsPage } from '@/features/cooperative/ProductsPage';
import { ProfilePage } from '@/features/cooperative/ProfilePage';
import { RegistrationRequestsPage } from '@/features/cooperative/RegistrationRequestsPage';
import { ForbiddenPage } from '@/features/errors/ForbiddenPage';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { ComingSoonPage } from '@/features/home/ComingSoonPage';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { ProductDetailPage } from '@/features/catalog/ProductDetailPage';
import { CATALOG_PATH } from '@/features/catalog/productSearch';
import { HomePage } from '@/features/home/HomePage';
import { OrganizationProfilePage } from '@/features/organizations/OrganizationProfilePage';
import { OrganizationSearchPage } from '@/features/organizations/OrganizationSearchPage';
import { ORGANIZATIONS_PATH } from '@/features/organizations/organizationSearch';
import { AppLayout } from '@/components/layout/AppLayout';
import { PUBLIC_SECTIONS, REGISTER_PATH } from '@/components/layout/publicSections';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: REGISTER_PATH, element: <RegisterPage /> },
      { path: VERIFY_EMAIL_PATH, element: <VerifyEmailPage /> },
      { path: ORGANIZATIONS_PATH, element: <OrganizationSearchPage /> },
      { path: CATALOG_PATH, element: <CatalogPage /> },
      { path: `${CATALOG_PATH}/:id`, element: <ProductDetailPage /> },
      ...PUBLIC_SECTIONS.filter(
        ({ path }) => path !== ORGANIZATIONS_PATH && path !== CATALOG_PATH,
      ).map(({ path, label }) => ({
        path,
        element: <ComingSoonPage title={label} />,
      })),
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: 'organizations/:slug', element: <OrganizationProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    // The observatory panel has its own header and side menu instead of the public ones.
    element: <RequireRole role={Role.ADMIN} />,
    children: [
      {
        path: ADMIN_HOME_PATH,
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminHomePage /> },
          { path: ADMIN_REGISTRATIONS_PATH, element: <RegistrationsPage /> },
          { path: ADMIN_ORGANIZATIONS_PATH, element: <OrganizationsPage /> },
          { path: ADMIN_PRODUCT_CATEGORIES_PATH, element: <ProductCategoriesPage /> },
        ],
      },
    ],
  },
  {
    // The cooperative panel has its own header and side menu instead of the public ones.
    element: <RequireRole role={Role.COOPERATIVE} />,
    children: [
      {
        path: COOPERATIVE_HOME_PATH,
        element: <CooperativeLayout />,
        children: [
          { index: true, element: <CooperativeHomePage /> },
          { path: COOPERATIVE_PROFILE_PATH, element: <ProfilePage /> },
          { path: COOPERATIVE_PRODUCTS_PATH, element: <ProductsPage /> },
          { path: NEW_PRODUCT_PATH, element: <ProductFormPage /> },
          { path: COOPERATIVE_PRODUCT_PATH, element: <ProductFormPage /> },
          { path: COOPERATIVE_REGISTRATION_REQUESTS_PATH, element: <RegistrationRequestsPage /> },
          { path: NEW_REGISTRATION_REQUEST_PATH, element: <NewRegistrationRequestPage /> },
          { path: COOPERATIVE_REGISTRATION_REQUEST_PATH, element: <CorrectRegistrationPage /> },
          ...COOPERATIVE_SECTIONS.filter(
            ({ path }) =>
              path !== COOPERATIVE_HOME_PATH &&
              path !== COOPERATIVE_PROFILE_PATH &&
              path !== COOPERATIVE_PRODUCTS_PATH &&
              path !== COOPERATIVE_REGISTRATION_REQUESTS_PATH,
          ).map(({ path, label }) => ({
            path,
            element: <ComingSoonPage title={label} homePath={COOPERATIVE_HOME_PATH} />,
          })),
        ],
      },
    ],
  },
];
