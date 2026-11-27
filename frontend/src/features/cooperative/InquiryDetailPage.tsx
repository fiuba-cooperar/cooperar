import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowRight,
  IconCircleCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import { BackLink } from '@/components/BackLink';
import { useState, type SyntheticEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { CharacterCount } from '@/components/form/CharacterCount';
import { InquiryStatus, type InquiryResponse } from '@/api/generated/model';
import {
  useChangeInquiryStatus,
  useInquiry,
  useInquiryNeighbors,
  useReplyToInquiry,
} from './api/useInquiries';
import {
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_LABELS,
  listSearchOf,
  type InquiryListState,
} from './inquiries';
import { useActiveOrganization, usePanelPaths } from './useActiveOrganization';
import styles from './InquiryDetailPage.module.css';

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' });

const REPLY_MAX_LENGTH = 5000;

interface StatusAction {
  label: string;
  status: InquiryStatus;
  variant: 'filled' | 'default';
}

/**
 * Only what makes sense from where the inquiry stands. Answering by email marks it responded on its own; the button is
 * for an answer given another way. Reopening goes back to where it was before closing: responded if it has answers.
 */
function statusActions(inquiry: InquiryResponse): StatusAction[] {
  const close: StatusAction = {
    label: 'Cerrar consulta',
    status: InquiryStatus.CLOSED,
    variant: 'default',
  };
  switch (inquiry.status) {
    case InquiryStatus.NEW:
      return [
        { label: 'Marcar como respondida', status: InquiryStatus.RESPONDED, variant: 'default' },
        close,
      ];
    case InquiryStatus.RESPONDED:
      return [close];
    case InquiryStatus.CLOSED:
    default:
      return [
        {
          label: 'Reabrir consulta',
          status: inquiry.replies.length > 0 ? InquiryStatus.RESPONDED : InquiryStatus.NEW,
          variant: 'default',
        },
      ];
  }
}

/**
 * Once a new inquiry is dealt with, how many new ones are left and the way to the next one: the older one after it in
 * the inbox, or the newer one if it was the oldest.
 */
function NextNewInquiry({
  organizationId,
  inquiryId,
  listSearch,
}: {
  organizationId: string;
  inquiryId: string;
  listSearch: string;
}) {
  const paths = usePanelPaths();
  const { data } = useInquiryNeighbors(organizationId, inquiryId, { status: InquiryStatus.NEW });
  if (!data) return null;
  const target = data.nextId ?? data.previousId;
  const state: InquiryListState = { listSearch };
  return (
    <Alert color="green" icon={<IconCircleCheck aria-hidden />} role="status">
      <Group justify="space-between" gap="sm">
        <Text size="sm">
          {data.total === 0
            ? 'No quedan consultas sin responder.'
            : data.total === 1
              ? 'Queda 1 consulta sin responder.'
              : `Quedan ${String(data.total)} consultas sin responder.`}
        </Text>
        {target && (
          <Button
            component={Link}
            to={paths.inquiry(target)}
            state={state}
            size="compact-md"
            rightSection={<IconArrowRight size={16} aria-hidden />}
          >
            Ver siguiente
          </Button>
        )}
      </Group>
    </Alert>
  );
}

/** One inquiry: what was asked, how to reach the sender, the answers sent, the form to answer and its status. */
export function InquiryDetailPage() {
  const organization = useActiveOrganization();
  const paths = usePanelPaths();
  const { id = '' } = useParams();
  const location = useLocation();
  const { data: inquiry, isPending, isError } = useInquiry(organization.id, id);
  const listSearch = listSearchOf(location.state);

  return (
    <Stack gap={24}>
      <BackLink to={listSearch ? `${paths.inquiries}?${listSearch}` : paths.inquiries}>
        Volver a Consultas
      </BackLink>
      {isPending && <Text role="status">Cargando la consulta…</Text>}
      {isError && (
        <Alert
          color="red"
          icon={<IconAlertCircle aria-hidden />}
          title="No pudimos cargar la consulta"
        >
          Probá de nuevo en unos minutos.
        </Alert>
      )}
      {inquiry === null && (
        <Stack gap={6}>
          <Title order={1} fz={28}>
            No encontramos esta consulta
          </Title>
          <Text c="dimmed">Es posible que el enlace corresponda a otra entidad.</Text>
        </Stack>
      )}
      {inquiry && (
        <Inquiry
          key={inquiry.id}
          organizationId={organization.id}
          inquiry={inquiry}
          listSearch={listSearch}
        />
      )}
    </Stack>
  );
}

function Inquiry({
  organizationId,
  inquiry,
  listSearch,
}: {
  organizationId: string;
  inquiry: InquiryResponse;
  listSearch: string;
}) {
  const paths = usePanelPaths();
  const changeStatus = useChangeInquiryStatus(organizationId, inquiry.id);
  // Answering it or changing its status deals with a new inquiry; then the way to the next one shows at the top.
  const [wasNew] = useState(inquiry.status === InquiryStatus.NEW);
  const completed = wasNew && inquiry.status !== InquiryStatus.NEW;

  return (
    <>
      <Group justify="space-between" align="flex-start" gap="md">
        <Stack gap={6} miw={0}>
          <Group gap="sm">
            <Title order={1} fz={28}>
              Consulta de {inquiry.senderName}
            </Title>
            {/* Announced when one of the buttons changes it. */}
            <span aria-live="polite">
              <Badge color={INQUIRY_STATUS_COLORS[inquiry.status]} variant="light">
                {INQUIRY_STATUS_LABELS[inquiry.status]}
              </Badge>
            </span>
          </Group>
          <Text c="dimmed">
            Sobre{' '}
            {inquiry.productId ? (
              <Anchor component={Link} to={paths.product(inquiry.productId)}>
                {inquiry.productName}
              </Anchor>
            ) : (
              inquiry.productName
            )}{' '}
            · {dateFormat.format(new Date(inquiry.createdAt))}
          </Text>
        </Stack>
        <Group gap="sm">
          {statusActions(inquiry).map(({ label, status, variant }) => (
            <Button
              key={label}
              variant={variant}
              onClick={() => {
                changeStatus.mutate(status);
              }}
            >
              {label}
            </Button>
          ))}
        </Group>
      </Group>
      {changeStatus.isError && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cambiar el estado. Probá de nuevo en unos minutos.
        </Alert>
      )}
      {completed && (
        <NextNewInquiry
          organizationId={organizationId}
          inquiryId={inquiry.id}
          listSearch={listSearch}
        />
      )}
      <div className={styles.columns}>
        <Paper withBorder radius="lg" p="lg" component="section" aria-labelledby="inquiry-message">
          <Title order={2} fz={18} id="inquiry-message" mb="sm">
            Mensaje
          </Title>
          <Text className={styles.message}>{inquiry.message}</Text>
          {/* The API sends null when it was left out. */}
          {typeof inquiry.quantity === 'number' && (
            <Text mt="sm" size="sm">
              <strong>Cantidad:</strong> {inquiry.quantity}
            </Text>
          )}
        </Paper>
        <Paper withBorder radius="lg" p="lg" component="section" aria-labelledby="inquiry-contact">
          <Title order={2} fz={18} id="inquiry-contact" mb="sm">
            Datos de contacto
          </Title>
          <dl className={styles.contact}>
            <dt>Nombre</dt>
            <dd>{inquiry.senderName}</dd>
            <dt>Email</dt>
            <dd>
              <Anchor href={`mailto:${inquiry.senderEmail}`}>{inquiry.senderEmail}</Anchor>
            </dd>
            {inquiry.senderPhone && (
              <>
                <dt>Teléfono</dt>
                <dd>
                  <Anchor href={`tel:${inquiry.senderPhone.replace(/[^\d+]/g, '')}`}>
                    {inquiry.senderPhone}
                  </Anchor>
                </dd>
              </>
            )}
          </dl>
          <Text size="xs" c="dimmed" mt="sm">
            Son datos personales: usalos solo para responder esta consulta.
          </Text>
        </Paper>
      </div>
      <Paper withBorder radius="lg" p="lg" component="section" aria-labelledby="inquiry-replies">
        <Title order={2} fz={18} id="inquiry-replies" mb="sm">
          Respuestas
        </Title>
        {inquiry.replies.length === 0 ? (
          <Text c="dimmed" size="sm" mb="md">
            Todavía no se envió ninguna respuesta desde la plataforma.
          </Text>
        ) : (
          <ol className={styles.replies}>
            {inquiry.replies.map((reply) => (
              <li key={reply.id}>
                <Text size="xs" c="dimmed">
                  {reply.authorName ? `${reply.authorName} · ` : ''}
                  {dateFormat.format(new Date(reply.sentAt))}
                </Text>
                <Text className={styles.message}>{reply.message}</Text>
              </li>
            ))}
          </ol>
        )}
        <ReplyForm organizationId={organizationId} inquiry={inquiry} />
      </Paper>
    </>
  );
}

function ReplyForm({
  organizationId,
  inquiry,
}: {
  organizationId: string;
  inquiry: InquiryResponse;
}) {
  const paths = usePanelPaths();
  const reply = useReplyToInquiry(organizationId, inquiry.id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();

  if (!inquiry.replyTo) {
    return (
      <Alert
        color="orange"
        icon={<IconInfoCircle aria-hidden />}
        title="Para responder por email, la ficha necesita un email de contacto"
      >
        <Stack gap="sm" align="flex-start">
          <Text size="sm">
            Las respuestas a tus mensajes llegan al email de contacto de la ficha.
          </Text>
          <Button component={Link} to={`${paths.profile}?section=contact`} size="compact-sm">
            Completar el contacto
          </Button>
        </Stack>
      </Alert>
    );
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError('Escribí la respuesta.');
      return;
    }
    setError(undefined);
    reply.mutate(message, {
      onSuccess: () => {
        setMessage('');
      },
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="sm">
        <Textarea
          label="Tu respuesta"
          resize="vertical"
          description={`Se envía por email a ${inquiry.senderEmail}. Si responde, el mensaje llega a ${inquiry.replyTo}.`}
          rows={5}
          maxLength={REPLY_MAX_LENGTH}
          value={message}
          error={error}
          onChange={(event) => {
            setMessage(event.currentTarget.value);
            if (reply.isSuccess) reply.reset();
          }}
        />
        <Group justify="flex-end" mt={-8}>
          <CharacterCount length={message.length} max={REPLY_MAX_LENGTH} />
        </Group>
        {reply.isError && (
          <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
            No pudimos enviar la respuesta. Probá de nuevo en unos minutos.
          </Alert>
        )}
        <Group justify="flex-end" gap="md">
          {/* Next to the button that sent it, until the next answer starts being written. */}
          <Text role="status" size="sm" c="dimmed" className={styles.sent}>
            {reply.isSuccess && (
              <>
                <IconCircleCheck size={18} aria-hidden className={styles.sentIcon} />
                Respuesta enviada a {inquiry.senderEmail}
              </>
            )}
          </Text>
          <Button type="submit" loading={reply.isPending}>
            Enviar respuesta
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
